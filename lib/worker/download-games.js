'use strict';

var async = require("async");
var debug = require('debug')('teamward:worker:download-games:queue');
var FJQ = require('featureless-job-queue');
var newrelic = require("newrelic");
var rarity = require("rarity");

var config = require('../../config');
var createPool = require('../model/sql/create-pool.js');
var errorLogger = require('../error-logger.js');

var gameInfo = require('../riot-api/game-info.js');
var Match = require('../model/sql/match.js');

const QUEUE_CONCURRENCY = config.gameDownloadQueueConcurrency;

var fjq = new FJQ({
  redisUrl: config.redisUrl,
  redisKey: 'download-games:jobs'
});

var sqlClient;

// Used as a flag to skip the waterfall
// While still ensuring we call newrelic.endTransaction
var passthrough = new Error("not an error");


var workerFunction = newrelic.createBackgroundTransaction('download-game:download', 'workers', function workerFunction(job, done) {
  async.waterfall([
    function checkAlreadyAvailable(cb) {
      sqlClient.query("SELECT id FROM matches WHERE id = $1 AND region= $2", [job.id, job.region], cb);
    },
    function downloadGameFromAPI(res, cb) {
      if(res.rows.length !== 0) {
        debug("Skipping game " + job.id);
        return cb(passthrough);
      }
      debug("Downloading game #" + job.id + " (" + job.region + ")");
      gameInfo.getExistingGame(job.id, job.region, cb);
    },
    function saveGame(apiMatchData, cb) {
      apiMatchData = apiMatchData.body;
      var match;
      try {
        match = Match.buildGame(apiMatchData);
      }
      catch(e) {
        return cb(new Error("Unable to build match"));
      }

      var columns = Object.keys(match);
      var values = columns.map(c => match[c]);
      var placeholders = columns.map(function(v, index) {
        return "$" + (index + 1);
      }).join(",");

      sqlClient.query("INSERT INTO matches(" + columns.join(',') + ") VALUES(" + placeholders + ")", values, rarity.carryAndSlice([apiMatchData], 2, cb));
    },
    function savePlayers(apiMatchData, cb) {
      var players;
      try {
        players = Match.buildPlayers(apiMatchData, job.knownPlayerInformation);
      }
      catch(e) {
        return cb(new Error("Unable to build participants"));
      }

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

      sqlClient.query("INSERT INTO matches_participants(" + columns.join(',') + ") VALUES " + inserts.join(","), values, cb);
    }
  ], function(err) {
    if(err && err === passthrough) {
      err = null;
    }

    if(err) {
      console.warn(err.toString());
    }

    newrelic.endTransaction();

    done();
  });
});


module.exports = function startQueue(options) {
  if(!options) {
    options = {};
  }

  sqlClient = createPool(QUEUE_CONCURRENCY);

  fjq.process(workerFunction, QUEUE_CONCURRENCY);

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
};

module.exports.workerFunction = workerFunction;
