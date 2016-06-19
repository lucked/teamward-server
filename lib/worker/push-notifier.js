'use strict';
var async = require("async");
var GCM = require("gcm").GCM;
var debug = require('debug')('teamward:worker');
var gameInfo = require('../riot-api/game-info.js');
var mongoose = require("mongoose");
var rarity = require("rarity");

var passthrough = new Error("Empty error");


module.exports = function startWorker(opbeat) {
  var gcm = new GCM(process.env.GCM_API_KEY);
  // This function will regularly check Riot API,
  // sending push notification when someone enters in game.

  var stream = mongoose.model('Token').find({}).stream();

  stream.on('data', function(token) {
    // Pause the stream while we handle this document
    stream.pause();
    async.waterfall([
      function getCurrentGame(cb) {
        gameInfo.getCurrentGame(token.summonerId, token.region, function(err, res) {
          if(err && err.statusCode === 404) {
            return cb(passthrough);
          }

          cb(err, res);
        });
      },
      function analyzeResult(res, cb) {
        if(!res.gameId) {
          // Issues with the Riot API
          return setTimeout(function() {
            cb(passthrough);
          }, 1000);
        }
        else if(res.gameId === token.lastKnownGameId) {
          // Summoner in game, but already notified.
          return cb(passthrough);
        }
        else {
          debug(token.summonerName + "(" + token.region + ") is in game #" + res.gameId + " (" + res.gameMode + " / " + res.gameType + ")");
          cb(null, res);
        }
      },
      function saveGameId(res, cb) {
        token.lastKnownGameId = res.gameId;
        token.lastKnownGameDate = new Date(res.gameStartTime);

        token.save(rarity.carryAndSlice(res, 2, cb));
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
      },
      function logNotification(messageId, cb) {
        debug(token.summonerName + " notified, message id " + messageId);
        cb();
      }], function(err) {
        if(err && opbeat && err !== passthrough) {
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
    setTimeout(function() {
      debug("Looping over!");
      startWorker();
    }, 1200);
  });
};
