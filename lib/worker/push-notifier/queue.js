'use strict';

var async = require("async");
var mongoose = require('mongoose');
var debug = require('debug')('teamward:worker:push-notifier');
var kue = require('kue');


var config = require('../../../config');
var errorLogger = require('../../error-logger.js');
var metricTracker = require('../../metric-tracker.js');
var queueWorker = require('./worker.js');

const QUEUE_CONCURRENCY = config.pushNotifierQueueConcurrency;


var noop = function() {};

module.exports = function startQueue(options) {
  var queue = kue.createQueue({
    jobEvents: false, // Do not send individual job events (useful for our case with many small tasks)
    redis: config.redisUrl
  });
  // queue.watchStuckJobs(60000);

  var addRefillQueueTaskIfNeeded = function(delay, cb) {
    queue.inactiveCount('refillQueue', function(err, total) {
      debug("Adding new refillQueue task");
      if(err) {
        return cb(err);
      }

      if(total === 0) {
        queue.create('refillQueue', {startedAt: new Date()}).delay(delay).ttl(5000).removeOnComplete(true).save(cb);
      }
    });
  };

  var refillQueueWorker = function(task, cb) {
    queue.inactiveCount('checkInGame', function(err, total) {
      if(err) {
        return cb(err);
      }

      if(total >= QUEUE_CONCURRENCY) {
        // We have enough token in the queue, skip task.
        debug("Skipping queue refill");
        addRefillQueueTaskIfNeeded(500, cb);
        return;
      }

      // Otherwise, add all the tokens to the queue
      mongoose.model('Token').find({}).lean().exec(function(err, tokens) {
        async.eachLimit(tokens, 10, function(token, cb) {
          queue.create('checkInGame', {token: token}).ttl(5000).removeOnComplete(true).save(cb);
        }, function(err) {
          if(err) {
            return cb(err);
          }

          var tokenCounter = tokens.length;
          if(task && task.startedAt) {
            var now = new Date();
            var timeToLoop = now.getTime() - task.startedAt.getTime();
            var timeToLoopSeconds = Math.round(timeToLoop / 1000);

            debug("Looping over (" + tokenCounter + " tokens in " + timeToLoopSeconds + "s)");

            var threshold = 60;
            if(timeToLoopSeconds > threshold) {
              debug("More than " + threshold + "s to loop over " + tokenCounter + " tokens -- " + timeToLoopSeconds + "s :(");
            }

            metricTracker("Worker.PushNotifier.LoopDuration", timeToLoop);
            metricTracker("Worker.PushNotifier.TokenCounter", tokenCounter);
          }
          else {
            debug("Added " + tokenCounter + " tokens to queue");
          }

          if(options.loop) {
            // Also enqueue another task to refill the queue again
            addRefillQueueTaskIfNeeded(1500, cb);
          }
          else {
            cb();
          }
        });
      });
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
