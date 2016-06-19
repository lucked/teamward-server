'use strict';

var opbeat = require('opbeat');
var async = require("async");

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
      gameInfo.getCurrentGame(summonerId, summonerRegion, function(err, res) {
        var error;

        if(err && err.statusCode === 404) {
          log("Not in a game right now.");

          error = new Error("Summoner not in game.");
          error.statusCode = 404;
          return cb(error);
        }

        if(!res.gameId) {
          error = new Error("Issues with the Riot API :( [CURR_GAME]");
          error.riotInternal = true;
          return cb(error);
        }

        log("In game #" + res.gameId + " (" + res.gameMode + " / " + res.gameType + ")");

        gameData(res, summonerRegion, cb);
      });
    },
    function sendData(data, cb) {
      var delta = new Date() - start;
      log("Fetched game information for " + req.query.summoner + " in " + delta + "ms");
      res.send(data);

      cb();
    },
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
