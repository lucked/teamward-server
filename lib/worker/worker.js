'use strict';
var async = require("async");

var debug = require('debug')('teamward:worker');
var gameInfo = require('../riot-api/game-info.js');
var mongoose = require("mongoose");

module.exports = function startWorker(opbeat) {
  // This function will regularly check Riot API,
  // sending push notification when someone enters in game.

  var stream = mongoose.model('Token').find({}).stream();

  stream.on('data', function(token) {
    // Pause the stream while we handle this document
    stream.pause();

    async.waterfall([
      function getCurrentGame(cb) {
        gameInfo.getCurrentGame(token.summonerId, token.region, cb);
      },
      function analyzeResult(res, cb) {
        console.log(res);

        if(res.status && res.status.status_code === 404) {
          // Summoner not in game.
          return cb();
        }
        else if(!res.gameId) {
          // Issues with the Riot API
          return setTimeout(cb, 1000);
        }
        else {
          debug(token.summonerName + "(" + token.summonerRegion + ") is in game #" + res.gameId + " (" + res.gameMode + " / " + res.gameType + ")");
          cb(null);
        }
      }], function(err) {
        if(err && opbeat) {
          opbeat.captureError(err);
        }

        setTimeout(function() {
          stream.resume();
        }, 1200);
      });

  });

  stream.on('error', function(err) {
    console.warn(err);
    if(opbeat) {
      opbeat.captureError(err);
    }

    setTimeout(startWorker, 15000);
  });

  stream.on('close', function() {
    // the stream is closed,
    // all tokens parsed.
    // Start again!
    process.nextTick(startWorker);
  });
};
