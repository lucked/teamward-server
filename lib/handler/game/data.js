'use strict';

var opbeat = require('opbeat');
var async = require("async");

var log = require('debug')('teamward:handler:game-data');

var gameData = require('../../helper/game-data.js');
var summonerInfo = require('../../riot-api/summoner-info');


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

      gameData(summonerData.id, summonerRegion, cb);
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
