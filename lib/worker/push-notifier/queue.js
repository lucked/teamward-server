'use strict';

var async = require("async");
var mongoose = require("mongoose");
var debug = require('debug')('teamward:worker:push-notifier');

var config = require('../../../config');
var errorLogger = require('../../error-logger.js');
var metricTracker = require('../../metric-tracker.js');
var queueWorker = require('./worker.js');

const QUEUE_CONCURRENCY = config.pushNotifierQueueConcurrency;
const QUEUE_MAX_SIZE = config.pushNotifierQueueMaxSize;


var queue = async.queue(queueWorker, QUEUE_CONCURRENCY);

var runWorker = function(cb) {
  // This function will go through all known tokens,
  // sending push notification when someone enters in game.
  var tokenCounter = 0;
  var tokenNotifiedCounter = 0;


  // Stream with lean objects, to avoid spending too long parsing JS objects
  // Without this, CPU usage goes to 100% :\
  var stream = mongoose.model('Token').find({}).lean().stream();

  var onFinish = function(err, tokenCounter, tokenNotifiedCounter) {
    stream.removeAllListeners();
    stream.destroy();
    cb(err, tokenCounter, tokenNotifiedCounter);
  };

  var onTaskFinished = function(err, notified) {
    if(err) {
      onFinish(err);
      return;
    }

    tokenCounter += 1;
    if(notified) {
      tokenNotifiedCounter += 1;
    }

    if(stream.paused && queue.length() <= 1.33  * QUEUE_CONCURRENCY) {
      stream.resume();
    }
  };

  stream.on('data', function(token) {
    var task = {
      token: token,
    };

    queue.push(task, onTaskFinished);

    if(queue.length() >= QUEUE_MAX_SIZE) {
      // Throttle the stream from mongo while handling the queue
      stream.pause();
    }
  });


  stream.on('error', function(err) {
    onFinish(err);
  });

  stream.on('close', function() {
    // the stream is exhausted,
    // all tokens parsed (or in the queue).

    queue.drain = function() {
      // All tokens parsed
      queue.drain = null;

      onFinish(null, tokenCounter, tokenNotifiedCounter);
    };
  });
};


// Main entry point for the script
module.exports = function(options, cb) {
  if(!options) {
    options = {};
  }

  // Do not register sigterm receiver when testing
  /* istanbul ignore next */
  if(!options.testing) {
    process.on('SIGTERM', function stopQueue() {
      debug("Received SIGTERM, pausing queue.");
      // Worker is dying, finish current stuff but do not start the processing of new tasks.
      queue.pause();
      setTimeout(function() {
        debug("Shutting down process after SIGTERM, queue was paused.");
        process.exit(0);
      }, 5000);
    });
  }

  var lastLoopedAt = new Date();

  /* istanbul ignore next */
  var defaultCb = function(err, tokenCounter, tokenNotifiedCounter) {
    if(err) {
      debug("Error while looping over tokens", err);
      errorLogger(err, {log: debug});
      if(options.loop) {
        setTimeout(function() {
          runWorker(defaultCb);
        }, 15000);
      }
      return;
    }

    if(options.loop) {
      var restartFunction = function() {
        var now = new Date();
        var timeToLoop = now.getTime() - lastLoopedAt.getTime();
        var timeToLoopSeconds = Math.round(timeToLoop / 1000);
        debug("Looping over (" + tokenCounter + " tokens in " + timeToLoopSeconds + "s), notified " + tokenNotifiedCounter + " token" + (tokenNotifiedCounter > 1 ? "s" : ""));

        var threshold = 60;
        if(timeToLoopSeconds > threshold) {
          debug("More than " + threshold + "s to loop over " + tokenCounter + " tokens -- " + timeToLoopSeconds + "s :(");
        }

        metricTracker("Worker.PushNotifier.LoopDuration", timeToLoop);
        metricTracker("Worker.PushNotifier.TokenCounter", tokenCounter);
        metricTracker("Worker.PushNotifier.NotifiedTokenCounter", tokenNotifiedCounter);
        lastLoopedAt = now;
        tokenCounter = 0;

        // On small dataset, do not loop too fast
        setTimeout(function() {
          runWorker(defaultCb);
        }, tokenCounter > QUEUE_CONCURRENCY ? 0 : 2500);
      };

      process.nextTick(restartFunction);
    }
  };

  runWorker(cb || defaultCb);
};

