'use strict';

var async = require("async");
var mongoose = require('mongoose');
var debug = require('debug')('teamward:worker:push-notifier:queue');
var kue = require('kue');
var newrelic = require("newrelic");
var rarity = require("rarity");


var config = require('../../../config');
var errorLogger = require('../../error-logger.js');
var metricTracker = require('../../metric-tracker.js');
var queueWorker = require('./worker.js');

const QUEUE_CONCURRENCY = config.pushNotifierQueueConcurrency;


var noop = function() {};
var passthrough = new Error("not an error");

module.exports = function startQueue(options) {
  options.delay = options.delay || 1000;

  var queue = kue.createQueue({
    jobEvents: false, // Do not send individual job events (useful for our case with many small tasks)
    redis: config.redisUrl
  });

  if(config.masterDyno) {
    queue.watchStuckJobs(1050);
  }

  var refillQueueWorker = newrelic.createBackgroundTransaction('push-notifier:refillQueue', 'workers', function(job, ctx, cb) {
    if(!cb) {
      cb = ctx;
      ctx = null;
    }

    var lastLoopStartedAt;
    var refillStartedAt = new Date();

    if(job.data && job.data.startedAt) {
      lastLoopStartedAt = new Date(job.data.startedAt);
    }

    if(!lastLoopStartedAt) {
      debug("Resetting a new loop.");
      lastLoopStartedAt = new Date();
    }

    async.waterfall([
      function howManyTokensLeft(cb) {
        queue.inactiveCount('checkInGame', cb);
      },
      function doWeNeedRefill(tokensLeftCount, cb) {
        if(tokensLeftCount > 0) {
          // We have enough token in the queue, skip task.
          debug("Tokens remaining in queue: " + tokensLeftCount);
          cb(passthrough);
          return;
        }

        debug("Starting a refill task");

        // Otherwise, find all the tokens
        mongoose.model('Token').find({}).select('_id token summonerName summonerId region lastKnownGameId inGame').lean().exec(cb);
      },
      function addTokensToQueue(tokens, cb) {
        // Add all the tokens to the queue
        async.eachLimit(tokens, 100, function(token, cb) {
          queue.create('checkInGame', {token: token, title: token.summonerName + " (" + token.region + ")"}).ttl(10000).removeOnComplete(true).save(cb);
        }, rarity.carry([tokens.length], cb));
      },
      function sendMetrics(tokenCount, cb) {
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
        metricTracker("Worker.PushNotifier.TokenCounter", tokenCount);

        cb(null, tokenCount);
      }
    ], function(err, tokenCount) {
      if(err && err === passthrough) {
        err = null;
      }

      if(err) {
        errorLogger(err, {log: debug});
      }

      // Add a new refillQueue task
      async.waterfall([
        function isThereAnotherRefillTaskInQueue(cb) {
          queue.delayedCount('refillQueue', cb);
        },
        function queueNewRefillTask(refillTaskInQueue, cb) {
          if(refillTaskInQueue === 0) {
            var startedAt = tokenCount ? new Date() : lastLoopStartedAt;
            queue.create('refillQueue', {startedAt: startedAt, title: startedAt.toString()}).delay(options.delay).ttl(15000).removeOnComplete(true).save(cb);
          }
          else {
            cb();
          }
        }
      ], function(secondErr) {
        // options.cb can be specified to be called *after* each loop
        if(options.cb) {
          options.cb(secondErr || err, tokenCount);
        }

        newrelic.endTransaction();
        cb(secondErr || err);
      });
    });
  });

  queue.process('checkInGame', QUEUE_CONCURRENCY, queueWorker);

  // Only the master dyno can handle refills
  if(config.masterDyno) {
    queue.process('refillQueue', refillQueueWorker);
  }

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

    // Remove stuck jobs too
    kue.Job.rangeByState('failed', 0, 100000, 'asc', function(err, jobs) {
      async.eachLimit(jobs, 30, function(j, cb) {
        j.remove(cb);
      }, noop);
    });
  }
};
