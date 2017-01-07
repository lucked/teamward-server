'use strict';

var async = require("async");
var GCM = require("gcm").GCM;
var mongoose = require("mongoose");
var newrelic = require("newrelic");
var debug = require('debug')('teamward:worker:push-notifier');

var config = require('../../config');
var gameInfo = require('../riot-api/game-info.js');
var gameData = require('../helper/game-data.js');
var errorLogger = require('../error-logger.js');
var metricTracker = require('../metric-tracker.js');

const QUEUE_CONCURRENCY = config.pushNotifierQueueConcurrency;
const QUEUE_MAX_SIZE = config.pushNotifierQueueMaxSize;

var passthrough = new Error("Empty error");
var noop = function() {};

var gcm = new GCM(process.env.GCM_API_KEY);

var queueWorker = function(task, cb) {
  var token = task.token;
  var notified = false;

  async.waterfall([
    function getCurrentGame(cb) {

      gameInfo.getCurrentGame(token.summonerId, token.region, function(err, res) {
        if(err && err.statusCode === 404) {
          if(token.inGame) {
            // Summoner was in game, is not anymore
            var message = {
              registration_id: token.token,
              'data.removeGameId': token.lastKnownGameId,
            };

            debug(token.summonerName + " (" + token.region + ") finished his game #" + token.lastKnownGameId);

            // Send out of game message to device, to remove notification.
            module.exports.gcm.send(message, noop);

            mongoose.model('Token').update({_id: token._id}, {inGame: false}, function(err) {
              cb(err || passthrough);
            });

            return;
          }
          return cb(passthrough);
        }

        cb(err, res);
      });
    },
    function analyzeResult(res, cb) {
      if(!res.gameId) {
        // Issues with the Riot API
        return setTimeout(function() {
          cb(passthrough);
        }, 1000);
      }
      else if(res.gameId === token.lastKnownGameId) {
        // Summoner in game, but already notified.
        return cb(passthrough);
      }
      else {
        debug(token.summonerName + " (" + token.region + ") is in game #" + res.gameId + " (" + res.gameMode + " / " + res.gameType + ")");
        cb(null, res);
      }
    },
    function saveGameId(res, cb) {
      // Apply changes on mongo
      var changes = {
        lastKnownGameId: res.gameId,
        inGame: true,
        lastKnownGameDate: new Date(res.gameStartTime)
      };

      mongoose.model('Token').update({_id: token._id}, changes, function(err) {
        cb(err, res);
      });
    },
    function sendNotification(res, cb) {
      var message = {
        registration_id: token.token,
        'data.gameId': res.gameId,
        'data.gameStart': res.gameStartTime,
        'data.gameMode': res.gameMode,
        'data.gameType': res.gameType,
        'data.mapId': res.mapId.toString(),
        'data.summonerName': token.summonerName,
        'data.region': token.region,
      };

      module.exports.gcm.send(message, cb);

      // Also prefetch game data, to cache them in case the user clicks on the notification
      gameData.buildExternalGameData(res, token.region, noop);

    },
    function logNotification(messageId, cb) {
      debug(token.summonerName + " notified, message id " + messageId);
      notified = true;
      cb();
    }], function(err) {
      if(err && err === passthrough) {
        err = null;
      }

      if(err && err.toString().indexOf('NotRegistered') !== -1) {
        debug("Invalid GCM token, removing " + token.summonerName);
        mongoose.model('Token').findOneAndRemove({_id: token._id}, noop);
        err = null;
      }

      cb(err, notified);
    });
};


var queue = async.queue(queueWorker, QUEUE_CONCURRENCY);

var runWorker = newrelic.createBackgroundTransaction('worker:push-notifier', 'worker', function(cb) {
  // This function will go through all known tokens,
  // sending push notification when someone enters in game.
  var tokenCounter = 0;
  var tokenNotifiedCounter = 0;

  // Stream with lean objects, to avoid spending too long parsing JS objects
  // Without this, CPU usage goes to 100% :\
  var stream = mongoose.model('Token').find({}).lean().stream();

  var unpauseStream = function(err, notified) {
    if(err) {
      stream.destroy();
      cb(err);
      return;
    }

    tokenCounter += 1;
    if(notified) {
      tokenNotifiedCounter += 1;
    }

    if(stream.paused && queue.length() <= 1.33  * QUEUE_CONCURRENCY) {
      // debug("Resuming queue");
      stream.resume();
    }
  };

  stream.on('data', function(token) {
    var task = {
      token: token,
    };

    queue.push(task, unpauseStream);

    if(queue.length() >= QUEUE_MAX_SIZE) {
      // debug("Throttling queue");
      // Throttle the stream from mongo while handling the queue
      stream.pause();
    }
  });


  stream.on('error', function(err) {
    queue.kill();
    stream.destroy();
    cb(err);
  });

  stream.on('close', function() {
    // the stream is exhausted,
    // all tokens parsed (or in the queue).

    queue.drain = function() {
      // All tokens parsed
      queue.drain = null;

      newrelic.endTransaction();

      cb(null, tokenCounter, tokenNotifiedCounter);
    };
  });
});


// Main entry point for the script
module.exports = function(options, cb) {
  if(!options) {
    options = {};
  }

  // Do not register sigterm receiver when testing
  /* istanbul ignore next */
  if(!options.testing) {
    process.on('SIGTERM', function stopQueue() {
      debug("Received SIGTERM, pausing queue.");
      // Worker is dying, finish current stuff but do not start the processing of new tasks.
      queue.pause();
      setTimeout(function() {
        debug("Shutting down process after SIGTERM, queue was paused.");
        process.exit(0);
      }, 5000);
    });
  }

  var lastLoopedAt = new Date();

  /* istanbul ignore next */
  var defaultCb = function(err, tokenCounter, tokenNotifiedCounter) {
    if(err) {
      debug("Error while looping over tokens", err);
      errorLogger(err, {log: debug});
      if(options.loop) {
        setTimeout(function() {
          runWorker(defaultCb);
        }, 15000);
      }
      return;
    }

    if(options.loop) {
      var restartFunction = function() {
        var now = new Date();
        var timeToLoop = now.getTime() - lastLoopedAt.getTime();
        var timeToLoopSeconds = Math.round(timeToLoop / 1000);
        debug("Looping over (" + tokenCounter + " tokens in " + timeToLoopSeconds + "s), notified " + tokenNotifiedCounter + " token" + (tokenNotifiedCounter > 1 ? "s" : ""));

        var threshold = 60;
        if(timeToLoopSeconds > threshold) {
          debug("More than " + threshold + "s to loop over " + tokenCounter + " tokens -- " + timeToLoopSeconds + "s :(");
        }

        metricTracker("Worker.PushNotifier.LoopDuration", timeToLoop);
        metricTracker("Worker.PushNotifier.TokenCounter", tokenCounter);
        lastLoopedAt = now;
        tokenCounter = 0;

        // On small dataset, do not loop too fast
        setTimeout(function() {
          runWorker(defaultCb);
        }, tokenCounter > QUEUE_CONCURRENCY ? 0 : 1000);
      };

      process.nextTick(restartFunction);
    }
  };

  runWorker(cb || defaultCb);
};

// Default gcm is exposed here, to be overriden in tests
module.exports.gcm = gcm;


