'use strict';

var async = require("async");
var mongoose = require('mongoose');
var debug = require('debug')('teamward:worker:push-notifier');
var kue = require('kue');
var rarity = require("rarity");


var config = require('../../../config');
var errorLogger = require('../../error-logger.js');
var metricTracker = require('../../metric-tracker.js');
var queueWorker = require('./worker.js');

const QUEUE_CONCURRENCY = config.pushNotifierQueueConcurrency;


var noop = function() {};
var passthrough = new Error("not an error");

module.exports = function startQueue(options) {
  options.delay = options.delay || 500;

  var queue = kue.createQueue({
    jobEvents: false, // Do not send individual job events (useful for our case with many small tasks)
    redis: config.redisUrl
  });
  queue.watchStuckJobs(1000);


  var refillQueueWorker = function(job, cb) {
    var lastLoopStartedAt;
    if(job.data && job.data.startedAt) {
      lastLoopStartedAt = new Date(job.data.startedAt);
    }

    if(!lastLoopStartedAt) {
      debug("Resetting a new loop.");
      lastLoopStartedAt = new Date();
    }

    async.waterfall([
      function isThereAnotherRefillTaskInQueue(cb) {
        queue.delayedCount('refillQueue', cb);
      },
      function queueNewRefillTask(refillTaskInQueue, cb) {
        if(refillTaskInQueue === 0) {
          queue.create('refillQueue', {startedAt: lastLoopStartedAt}).delay(options.delay).ttl(5000).removeOnComplete(true).save(cb);
        }
        else {
          cb();
        }
      },
      function howManyTokensLeft(cb) {
        queue.inactiveCount('checkInGame', cb);
      },
      function doWeNeedRefill(tokensLeftCount, cb) {
        if(tokensLeftCount > 0) {
          // We have enough token in the queue, skip task.
          cb(passthrough);
          return;
        }

        // Otherwise, find all the tokens
        mongoose.model('Token').find({}).lean().exec(cb);
      },
      function addTokensToQueue(tokens, cb) {
        // Add all the tokens to the queue
        async.eachLimit(tokens, 50, function(token, cb) {
          queue.create('checkInGame', {token: token}).ttl(5000).removeOnComplete(true).save(cb);
        }, rarity.carry([tokens.length], cb));
      },
      function sendMetrics(tokenCount, cb) {
        var now = new Date();
        var timeToLoop = now.getTime() - lastLoopStartedAt.getTime();
        var timeToLoopSeconds = Math.round(timeToLoop / 1000);

        debug("Looping over (" + tokenCount + " tokens in " + timeToLoopSeconds + "s)");

        var threshold = 60;
        if(timeToLoopSeconds > threshold) {
          debug("More than " + threshold + "s to loop over " + tokenCount + " tokens -- " + timeToLoopSeconds + "s :(");
        }

        metricTracker("Worker.PushNotifier.LoopDuration", timeToLoop);
        metricTracker("Worker.PushNotifier.TokenCounter", tokenCount);

        cb(null, tokenCount);
      }
    ], function(err, tokenCount) {
      if(err && err === passthrough) {
        err = null;
      }

      if(err && err !== passthrough) {
        errorLogger(err, {log: debug});
      }

      // options.cb can be specified to be called *after* each loop
      if(!err && options.cb) {
        options.cb(null, tokenCount);
      }

      cb(err);
    });
  };

  queue.process('checkInGame', QUEUE_CONCURRENCY, queueWorker);
  queue.process('refillQueue', refillQueueWorker);

  debug("Started " + QUEUE_CONCURRENCY + " workers");

  refillQueueWorker({}, noop);

  // Do not register sigterm receiver when testing
  /* istanbul ignore next */
  if(!options.testing) {
    process.once('SIGTERM', function stopQueue() {
      debug("Received SIGTERM, pausing queue.");
      // Dyno is dying, finish current stuff but do not start the processing of new tasks.
      queue.shutdown(5000, function(err) {
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
