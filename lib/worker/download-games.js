'use strict';

var async = require("async");
var debug = require('debug')('teamward:worker:download-games:queue');
var FJQ = require('featureless-job-queue');
var newrelic = require("newrelic");
var superagent = require("superagent");
var rarity = require("rarity");

var config = require('../../config');
var createPool = require('../model/sql/create-pool.js');
var errorLogger = require('../error-logger.js');

var Match = require('../model/sql/match.js');

const QUEUE_CONCURRENCY = config.gameDownloadQueueConcurrency;

var fjq = new FJQ({
  redisUrl: config.redisUrl,
  redisKey: 'download-games:jobs'
});

var sqlClient;


var workerFunction = newrelic.createBackgroundTransaction('download-game:download', 'workers', function workerFunction(job, done) {
  async.waterfall([
    function downloadGameFromAPI(cb) {
      debug("Downloading game #" + job.id + " (" + job.region + ")");
      superagent.get('https://' + job.region + '.api.riotgames.com/api/lol/' + job.region + '/v2.2/match/' + job.id + '?api_key=' + process.env.RIOT_API_KEY).end(cb);
      // gameInfo.getExistingGame(job.id, job.region, cb);
    },
  ], function(err) {
      if(err) {
        console.warn(err.toString());
      }

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
