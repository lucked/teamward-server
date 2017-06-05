'use strict';

var async = require("async");
var debug = require('debug')('teamward:worker:download-games:queue');
var FJQ = require('featureless-job-queue');
var newrelic = require("newrelic");
var rarity = require("rarity");
var anyDB = require("any-db");

var config = require('../../config');
var errorLogger = require('../error-logger.js');

var gameInfo = require('../riot-api/game-info.js');
var Match = require('../model/sql/match.js');

const QUEUE_CONCURRENCY = config.gameDownloadQueueConcurrency;

var fjq = new FJQ({
  redisUrl: config.redisUrl,
  redisKey: 'download-games:jobs'
});

// Pool is not intiialized by default, we'll only open SQL connections if we use this function at some point
// (for instance, there is no point creating a SQL pool for web workers)
var pool;


var workerFunction = newrelic.createBackgroundTransaction('download-game:download', 'workers', function workerFunction(job, done) {
  // One time pool initialization
  if(!pool) {
    pool = anyDB.createPool(config.sqlUrl, {
      min: 2,
      max: QUEUE_CONCURRENCY,
      reset: function(conn, done) {
        conn.query('ROLLBACK', done);
      }});
  }

  async.waterfall([
    function checkAlreadyAvailable(cb) {
      pool.query("SELECT id FROM matches WHERE id = $1 AND region= $2", [job.id, job.region], cb);
    },
    function downloadGameFromAPI(res, cb) {
      if(res.rowCount !== 0) {
        debug("Skipping game " + job.id);
        return done();
      }
      debug("Downloading game #" + job.id + " (" + job.region + ")");
      gameInfo.getExistingGame(job.id, job.region, cb);
    },
    function saveGame(apiMatchData, cb) {
      var match = Match.buildGame(apiMatchData);

      var columns = Object.keys(match);
      var values = columns.map(c => match[c]);
      var placeholders = columns.map(function(v, index) {
        return "$" + (index + 1);
      }).join(",");

      pool.query("INSERT INTO matches(" + columns.join(',') + ") VALUES(" + placeholders + ")", values, rarity.carryAndSlice([apiMatchData], 2, cb));
    },
    function savePlayers(apiMatchData, cb) {
      var players;
      players = Match.buildPlayers(apiMatchData, job.knownPlayerInformation);

      var columns = Object.keys(players[0]);
      var values = [];
      var inserts = [];

      var counter = 0;
      players.forEach(function(player) {
        values = values.concat(columns.map(c => player[c]));
        var placeholders = columns.map(function() {
          counter += 1;
          return "$" + counter;
        }).join(",");

        inserts.push("(" + placeholders + ")");
      });

      pool.query("INSERT INTO matches_participants(" + columns.join(',') + ") VALUES " + inserts.join(","), values, cb);
    }
  ], function(err) {
      if(err) {
        console.warn(err);
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
  }

  return queue;
};

module.exports.workerFunction = workerFunction;
