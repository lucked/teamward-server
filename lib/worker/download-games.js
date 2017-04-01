'use strict';

var async = require("async");
var mongoose = require('mongoose');
var debug = require('debug')('teamward:worker:push-notifier:queue');
var FJQ = require('featureless-job-queue');
var newrelic = require("newrelic");

var config = require('../../config');
var errorLogger = require('../error-logger.js');
var gameInfo = require('../riot-api/game-info.js');

const QUEUE_CONCURRENCY = config.gameDownloadQueueConcurrency;

var fjq = new FJQ({
  redisUrl: config.redisUrl,
  redisKey: 'download-games:jobs'
});


var workerFunction = newrelic.createBackgroundTransaction('download-game:download', 'workers', function workerFunction(job, cb) {
  var Match = mongoose.model('Match');

  async.waterfall([
    function downloadGameFromAPI(cb) {
      gameInfo.getExistingGame(job.id, job.region, cb);
    },
    function saveGameToMongo(apiMatchData, cb) {
      var match = Match.fromAPI(apiMatchData);
      match.save(cb);
    }], cb);
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

    queue.drain = function() {
      fjq.shutdown(function() {
        process.exit(0);
      });
    };
  }

  return queue;
};

module.exports.workerFunction = workerFunction;
