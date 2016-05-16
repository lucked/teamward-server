'use strict';
var debug = require('debug')('gss:worker');

var mongoose = require("mongoose");

module.exports = function startWorker(opbeat) {
  // This function will regularly check Riot API,
  // sending push notification when someone enters in game.

  var stream = mongoose.model('Token').find({}).stream();

  stream.on('data', function(doc) {
    // Pause the stream while we handle this document
    stream.pause();

    console.log(doc.token);

    stream.resume();
  });

  stream.on('error', function(err) {
    console.warn(err);
    if(opbeat) {
      opbeat.captureError(err);
    }

    setTimeout(startWorker, 15000);
  });

  stream.on('close', function() {
    // the stream is closed
    setTimeout(startWorker, 15000);
  });
};
