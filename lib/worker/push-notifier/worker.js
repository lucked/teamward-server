'use strict';

var async = require("async");
var GCM = require("gcm").GCM;
var mongoose = require("mongoose");
var newrelic = require("newrelic");
var debug = require('debug')('teamward:worker:push-notifier');

var config = require('../../../config/');
var gameInfo = require('../../riot-api/game-info.js');
var gameData = require('../../helper/game-data.js');

// Used as a flag to skip the loop while ensuring the last function is run
var passthrough = new Error("not an error");

var noop = function() {};

var gcm = new GCM(config.gcmApiKey);

module.exports = function(job, cb) {
  var token = job.data.token;
  var notified = false;

  async.waterfall([
    function getCurrentGame(cb) {

      gameInfo.getCurrentGame(token.summonerId, token.region, function(err, res) {
        if(err && err.statusCode === 404) {
          if(token.inGame) {
            // Summoner was in game, is not anymore
            var message = {
              registration_id: token.token,
              'data.removeGameId': token.lastKnownGameId,
            };

            debug(token.summonerName + " (" + token.region + ") finished his game #" + token.lastKnownGameId);

            // Send out of game message to device, to remove notification.
            module.exports.gcm.send(message, noop);

            mongoose.model('Token').update({_id: token._id}, {inGame: false}, function(err) {
              cb(err || passthrough);
            });

            return;
          }
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
        debug(token.summonerName + " (" + token.region + ") is in game #" + res.gameId + " (" + res.gameMode + " / " + res.gameType + ")");
        cb(null, res);
      }
    },
    function saveGameId(res, cb) {
      // Apply changes on mongo
      var changes = {
        lastKnownGameId: res.gameId,
        inGame: true,
        lastKnownGameDate: new Date()
      };

      mongoose.model('Token').update({_id: token._id}, changes, function(err) {
        cb(err, res);
      });
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

      module.exports.gcm.send(message, cb);

      // Also prefetch game data, to cache them in case the user clicks on the notification
      gameData.buildExternalGameData(res, token.region, noop);

    },
    function logNotification(messageId, cb) {
      debug(token.summonerName + " notified, message id " + messageId);
      notified = true;
      cb();
    }], function(err) {
      var finishTransaction = function(err) {
        newrelic.endTransaction();
        cb(err, notified);
      };

      if(err && err === passthrough) {
        err = null;
      }

      if(err && err.riotInternal) {
        // We're not interested in issues with the Riot API, so skip them
        err = null;
      }



      if(err && (err.toString().indexOf('NotRegistered') !== -1 || err.toString().indexOf('InvalidRegistration') !== -1)) {
        debug("Invalid GCM token, removing " + token.summonerName, err.toString());
        mongoose.model('Token').findOneAndRemove({_id: token._id}, finishTransaction);
      }
      else {
        finishTransaction(err);
      }
    });
};


// Default gcm is exposed here, to be overriden in tests
module.exports.gcm = gcm;


