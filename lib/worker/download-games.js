'use strict';

var async = require("async");
var debug = require('debug')('teamward:worker:download-games:queue');
var FJQ = require('featureless-job-queue');
var newrelic = require("newrelic");
var rarity = require("rarity");
var anyDB = require("any-db");
var begin = require('any-db-transaction');

var config = require('../../config');
var errorLogger = require('../error-logger.js');

var gameInfo = require('../riot-api/game-info.js');
var Match = require('../model/sql/match.js');

const QUEUE_CONCURRENCY = config.gameDownloadQueueConcurrency;

var fjq = new FJQ({
  redisUrl: config.redisUrl,
  redisKey: 'download-games:jobs'
});

var pool = anyDB.createPool(config.sqlUrl, {min: 2, max: QUEUE_CONCURRENCY});

var gameCounter = 0;

var workerFunction = newrelic.createBackgroundTransaction('download-game:download', 'workers', function workerFunction(job, done) {
  gameCounter += 1;

  var transaction;

  debug("Downloading game #" + job.id + " (" + job.region + ")");

  async.waterfall([
    function checkAlreadyAvailable(cb) {
      pool.query("SELECT id FROM matches WHERE id = ? AND region= ?", [job.id, job.region], cb);
    },
    function downloadGameFromAPI(res, cb) {
      if(res.rowCount !== 0) {
        debug("Skipping game " + job.id);
        return done();
      }
      gameInfo.getExistingGame(job.id, job.region, cb);
    },
    function createTransaction(apiMatchData, cb) {
      begin(pool, rarity.carry([apiMatchData], cb));
    },
    function saveGameToMongo(apiMatchData, txn, cb) {
      transaction = txn;

      var match = Match.buildGame(apiMatchData);

      var columns = Object.keys(match);
      var values = columns.map(c => match[c]);
      var placeholders = columns.map(function() {
        return "?";
      }).join(",");

      transaction.query("INSERT INTO matches(" + columns.join(',') + ") VALUES(" + placeholders + ")", values, rarity.carry([apiMatchData], cb));
    },
    function savePlayersToMongo(apiMatchData, res, cb) {
      var players = Match.buildPlayers(apiMatchData);
      var columns = Object.keys(players[0]);
      var values = [];
      var inserts = [];
      players.forEach(function(player) {
        values = values.concat(columns.map(c => player[c]));
        var placeholders = columns.map(function() {
          return "?";
        }).join(",");

        inserts.push("(" + placeholders + ")");
      });

      transaction.query("INSERT INTO matches_participants(" + columns.join(',') + ") VALUES " + inserts.join(","), values, cb);
    },
    function commitTransaction(res, cb) {
      transaction.commit(cb);
    }], function(err) {
      if(err && transaction) {
        transaction.rollback();
      }

      done(err);
    });
});


module.exports = function startQueue(options) {
  if(!options) {
    options = {};
  }

  var queue = fjq.process(workerFunction, QUEUE_CONCURRENCY);

  // Do not register sigterm receiver when testing
  /* istanbul ignore next */
  if(!options.testing) {
    process.once('SIGTERM', function stopQueue() {
      debug("Received SIGTERM, pausing queue.");
      // Dyno is dying, finish current stuff but do not start the processing of new tasks.
      fjq.shutdown(function(err) {
        if(err) {
          errorLogger(err);
        }
        else {
          debug("Shutting down process after SIGTERM, workers were paused.");
          process.exit(0);
        }
      });
    });

    /*
    queue.drain = function() {
      debug("Finished downloading " + gameCounter + "games");
      metricTracker("Worker.DownloadGame.Counter", gameCounter);
      fjq.shutdown(function() {
        setTimeout(function() {
          process.exit(0);
        }, 200);
      });
    };

    // On empty queue, exist immediately  (mostly for development)
    setTimeout(function() {
      if(gameCounter === 0) {
        queue.drain();
      }
    }, 5000);
    */
  }

  return queue;
};

module.exports.workerFunction = workerFunction;
