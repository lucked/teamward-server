'use strict';

var opbeat = require('opbeat');
var async = require("async");
var mongoose = require("mongoose");

var log = require('debug')('teamward:handler:game-data');

var gameData = require('../../helper/game-data.js');
var summonerInfo = require('../../riot-api/summoner-info');
var gameInfo = require('../../riot-api/game-info');


module.exports.get = function(req, res) {
  var start = new Date();
  var summonerName = req.query.summoner;
  var summonerRegion = req.query.region;

  async.waterfall([
    function getSummonerId(cb) {
      summonerInfo.getSummonerData(summonerName, summonerRegion, cb);
    },
    function getGameData(summonerData, cb) {
      var error;

      if(!summonerData) {
        error = new Error("Issues with the Riot API :( [MISS_SUMM_DATA]");
        error.riotInternal = true;
        log(error.toString());
        return cb(error);
      }

      if(!summonerData.id) {
        log("Summoner does not exist.");

        error = new Error("Summoner does not exist!");
        error.statusCode = 404;
        cb(error);
      }
      log("Got summoner id: " + summonerData.id);

      cb(null, summonerData.id);
    },
    function loadCurrentGame(summonerId, cb) {
      gameInfo.getCurrentGame(summonerId, summonerRegion, function(err, gameInfo) {
        var error;

        if(err && err.statusCode === 404) {
          log("Not in a game right now.");

          error = new Error("Summoner not in game.");
          error.statusCode = 404;
          return cb(error);
        }

        if(!gameInfo.gameId) {
          error = new Error("Issues with the Riot API :( [CURR_GAME]");
          error.riotInternal = true;
          return cb(error);
        }

        log("In game #" + gameInfo.gameId + " (" + gameInfo.gameMode + " / " + gameInfo.gameType + ")");

        gameData.buildExternalGameData(gameInfo, summonerRegion, cb);
      });
    },
    function sendData(data, cb) {
      var delta = new Date() - start;
      log("Fetched game information for " + req.query.summoner + " in " + delta + "ms");
      res.send(data);

      cb(null, data);
    },
    function logData(gameData, cb) {
      var Game = mongoose.model("Game");
      var game = new Game();
      game.data = gameData;
      game.gameId = gameData.game_id;
      game.region = summonerRegion;
      game.save(function(err) {
        if(err && err.toString().indexOf("E11000") !== -1) {
          log("Game already logged in database");
          err = null;
        }
        cb(err);
      });
    }
  ], function(err) {
    if(err) {
      log(err);
      res.status(err.statusCode || 500).send(err.toString());

      if(err.riotInternal) {
        opbeat.captureError(err, req);
      }

      return;
    }
  });
};
