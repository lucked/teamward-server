'use strict';

var async = require("async");
var mongoose = require('mongoose');
var debug = require('debug')('teamward:worker:push-notifier:queue');
var FJQ = require('featureless-job-queue');
var newrelic = require("newrelic");

var config = require('../../../config');
var errorLogger = require('../../error-logger.js');
var metricTracker = require('../../metric-tracker.js');
var queueWorker = require('./worker.js');

const QUEUE_CONCURRENCY = config.pushNotifierQueueConcurrency;

var fjq = new FJQ({
  redisUrl: config.redisUrl
});

module.exports = function startQueue(options) {
  if(!options) {
    options = {};
  }

  options.thunderingHerdSpan = 'thunderingHerdSpan' in options ? options.thunderingHerdSpan : 30000;

  var refillQueueWorker = newrelic.createBackgroundTransaction('push-notifier:refillQueue', 'workers', function(job, cb) {
    var lastLoopStartedAt = new Date(job.startedAt);
    var refillStartedAt = new Date();
    var tokenCount;

    async.waterfall([
      function findAllTokens(cb) {
        // Otherwise, find all the tokens
        mongoose.model('Token').find({}).read('secondaryPreferred').select('_id token summonerName summonerId region lastKnownGameId inGame').lean().exec(cb);
      },
      function addTokensToQueue(tokens, cb) {
        tokenCount = tokens.length;
        fjq.create(tokens, cb);
      },
      function addDelayOnSmallDataset(cb) {
        /* istanbul ignore next */
        if(tokenCount < 10 && process.env.NODE_ENV === "production") {
          setTimeout(cb, 5000);
          return;
        }
        cb();
      },
      function addRefillTaskToQueue(cb) {
        fjq.create({
          refillQueue: true,
          startedAt: new Date(),
        }, cb);
      },
      function sendMetrics(cb) {
        var now = new Date();
        var timeToLoop = now.getTime() - lastLoopStartedAt.getTime();
        var timeToLoopSeconds = Math.round(timeToLoop / 1000);
        var timeToRefill = now.getTime() - refillStartedAt.getTime();
        var timeToRefillSeconds = Math.round(timeToRefill / 1000);

        debug("Looping over (" + tokenCount + " tokens in " + timeToLoopSeconds + "s) (refill time: " + timeToRefillSeconds + "s)");

        var threshold = 60;
        if(timeToLoopSeconds > threshold) {
          debug("More than " + threshold + "s to loop over " + tokenCount + " tokens -- " + timeToLoopSeconds + "s :(");
        }

        metricTracker("Worker.PushNotifier.LoopDuration", timeToLoop);
        metricTracker("Worker.PushNotifier.RefillDuration", timeToRefill);
        metricTracker("Worker.PushNotifier.TokenCounter", tokenCount);

        cb(null);
      },
    ], function(err) {
      if(err && err.toString().indexOf("queue was shutdown") !== -1) {
        // Worker has been shutdown, and we can't jobs create anymore. That's fine, potentialInitializer() will do the refill on next startup
        err = null;
      }

      if(err) {
        errorLogger(err, {log: debug});
      }

      // options.cb can be specified to be called *after* each loop
      if(options.cb) {
        options.cb(err, tokenCount);
      }

      newrelic.endTransaction();
      cb(err);
    });
  });

  // Send jobs to the correct worker (either a checkInGame or a refillQueue)
  fjq.process(function(job, cb) {
    if(job.refillQueue) {
      return refillQueueWorker(job, cb);
    }
    queueWorker(job, cb);
  }, QUEUE_CONCURRENCY);

  debug("Started " + QUEUE_CONCURRENCY + " workers");

  setTimeout(function potentialInitializer() {
    // This is only used on an empty Redis collection.
    // The setTimeout prevents a thundering herd on on initialization in a multi-server deployment
    fjq.length(function(err, count) {
      if(err) {
        return errorLogger(err, {log: debug});
      }

      if(count === 0) {
        debug("Empty initial queue :( adding refill task");
        refillQueueWorker({
          refillQueue: true,
          startedAt: new Date(),
        }, errorLogger);
      }
      else {
        debug("Starting worker, currently " + count + " jobs in queue.");
      }
    });
  }, Math.random() * options.thunderingHerdSpan);

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

module.exports.fjq = fjq;
