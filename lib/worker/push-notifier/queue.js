'use strict';

var async = require("async");
var mongoose = require('mongoose');
var debug = require('debug')('teamward:worker:push-notifier');
var monq = require('monq');


var config = require('../../../config');
var errorLogger = require('../../error-logger.js');
var metricTracker = require('../../metric-tracker.js');
var queueWorker = require('./worker.js');

const QUEUE_CONCURRENCY = config.pushNotifierQueueConcurrency;
const QUEUE_NAME = "push-notifier";
var client = monq(config.mongoUrl);

var queue = client.queue(QUEUE_NAME);
var noop = function() {};

module.exports = function startQueue(options) {
  var refillQueue = function(task, cb) {
    if(!cb) {
      cb = noop;
    }

    // Add all the tokens to the queue
    mongoose.model('Token').find({}).lean().exec(function(err, tokens) {
      async.eachLimit(tokens, 10, function(token, cb) {
        queue.enqueue('checkInGame', {token: token}, cb);
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
          queue.enqueue('refillQueue', {startedAt: new Date()}, cb);
        }
        else {
          cb();
        }
      });
    });
  };

  var worker = client.worker([QUEUE_NAME]);
  worker.register({
    checkInGame: queueWorker,
    refillQueue: refillQueue
  });

  worker.on('error', function(err) {
    debug("Error while looping over tokens", err);
    errorLogger(err, {log: debug});
  });

  worker.start();

  debug("Started " + QUEUE_CONCURRENCY + " workers");

  refillQueue();

  // Do not register sigterm receiver when testing
  /* istanbul ignore next */
  if(!options.testing) {
    process.on('SIGTERM', function stopQueue() {
      debug("Received SIGTERM, pausing queue.");
      // Dyno is dying, finish current stuff but do not start the processing of new tasks.
      worker.stop();
      setTimeout(function() {
        debug("Shutting down process after SIGTERM, workers were paused.");
        process.exit(0);
      }, 5000);
    });
  }
};
