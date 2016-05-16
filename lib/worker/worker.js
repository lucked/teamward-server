'use strict';
var async = require("async");
var GCM = require("gcm").GCM;
var debug = require('debug')('teamward:worker');
var gameInfo = require('../riot-api/game-info.js');
var mongoose = require("mongoose");

var passthrough = new Error("Empty error");


module.exports = function startWorker(opbeat) {
  console.log("START");

  var gcm = new GCM(process.env.GCM_API_KEY);
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
        if(res.status && res.status.status_code === 404) {
          // Summoner not in game.
          return cb(passthrough);
        }
        else if(!res.gameId) {
          // Issues with the Riot API
          return setTimeout(function() {
            cb(passthrough);
          }, 1000);
        }
        else {
          debug(token.summonerName + "(" + token.region + ") is in game #" + res.gameId + " (" + res.gameMode + " / " + res.gameType + ")");
          cb(null, res);
        }
      },
      function sendNotification(res, cb) {
        var message = {
          registration_id: token.token,
          'data.gameId': res.gameId,
          'data.gameStart': res.gameStartTime,
          'data.gameMode': res.gameMode,
          'data.gameType': res.gameType,
          'data.mapId': res.mapId.toString(),
          'data.summonerName': token.summonerName,
          'data.region': token.region,
        };

        gcm.send(message, cb);
      }], function(err, messageId) {
        if(err && opbeat && err !== passthrough) {
          opbeat.captureError(err);
        }
        else if(messageId) {
          debug(token.summonerName + " notified, message id " + messageId);
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
    // process.nextTick(startWorker);
  });
};
