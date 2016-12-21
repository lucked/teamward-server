'use strict';

var async = require("async");
var GCM = require("gcm").GCM;
var mongoose = require("mongoose");
var rarity = require("rarity");
var newrelic = require("newrelic");
var debug = require('debug')('teamward:worker:push-notifier');

var config = require('../../config');
var gameInfo = require('../riot-api/game-info.js');
var gameData = require('../helper/game-data.js');

const QUEUE_CONCURRENCY = config.pushNotifierQueueConcurrency;
const QUEUE_MAX_SIZE = config.pushNotifierQueueMaxSize;

var passthrough = new Error("Empty error");
var noop = function() {};

var gcm = new GCM(process.env.GCM_API_KEY);

var queueWorker = function(task, cb) {
  var token = task.token;

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
            gcm.send(message, noop);

            token.inGame = false;
            token.save(function(err) {
              if(err) {
                return cb(err);
              }

              cb(passthrough);
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
      token.lastKnownGameId = res.gameId;
      token.inGame = true;
      token.lastKnownGameDate = new Date(res.gameStartTime);

      token.save(rarity.carryAndSlice(res, 2, cb));
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

      gcm.send(message, cb);

      // Also prefetch game data, to cache them in case the user clicks on the notification
      gameData.buildExternalGameData(res, token.region, noop);

    },
    function logNotification(messageId, cb) {
      debug(token.summonerName + " notified, message id " + messageId);
      cb();
    }], function(err) {
      if(err && err.toString().indexOf('NotRegistered') !== -1) {
        debug("Invalid GCM token, removing " + token.summonerName);
        token.remove();
      }

      cb();
    });
};


var queue = async.queue(queueWorker, QUEUE_CONCURRENCY);

module.exports = newrelic.createBackgroundTransaction('worker:push-notifier', 'worker', function startWorker(opbeat) {
  var tokenCounter = 0;
  var lastLoopedAt = new Date();

  // This function will regularly check Riot API,
  // sending push notification when someone enters in game.

  var stream = mongoose.model('Token').find({}).cursor();

  var unpauseStream = function(err) {
    if(err && opbeat && err !== passthrough) {
      opbeat.captureError(err);
    }

    if(stream.paused && queue.length() <= 1.33 * QUEUE_CONCURRENCY) {
      // debug("Resuming queue");
      stream.resume();
    }
  };

  stream.on('data', function(token) {
    tokenCounter += 1;
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
    console.warn(err);
    if(opbeat) {
      opbeat.captureError(err);
    }

    setTimeout(startWorker, 15000);
  });

  stream.on('close', function() {
    // the stream is closed,
    // all tokens parsed (or in the queue).

    var restartFunction = function() {
      newrelic.endTransaction();

      var now = new Date();
      var timeToLoop = now.getTime() - lastLoopedAt.getTime();
      timeToLoop = Math.round(timeToLoop / 1000);
      debug("Looping over (" + tokenCounter + " tokens in " + timeToLoop + "s)!");

      var threshold = 45;
      if(timeToLoop > threshold) {
        debug("More than " + threshold + "s to loop over tokens :(");
      }

      newrelic.recordMetric('Worker/PushNotifier/LoopDuration', timeToLoop);
      lastLoopedAt = now;
      tokenCounter = 0;
      startWorker();
    };

    // Start again!
    // If we have less tokens than the queue concurrency, manually throttle to avoid piling recurrent requests in the queue.
    setTimeout(restartFunction, tokenCounter < QUEUE_CONCURRENCY ? 5000 : 200);
  });
});

process.on('SIGTERM', function stopQueue() {
  debug("Received SIGTERM, pausing queue.");
  // Worker is dying, finish current stuff but do not start the processing of new tasks.
  queue.pause();
  setTimeout(function() {
    debug("Shutting down process after SIGTERM, queue was paused.");
    process.exit(0);
  }, 5000);
});
