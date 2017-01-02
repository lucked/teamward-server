"use strict";

var async = require("async");
var rarity = require("rarity");
var log = require('debug')('teamward:handler:summoner-data');

var errorLogger = require('../../error-logger');
var summonerInfo = require('../../riot-api/summoner-info.js');
var ddragon = require('../../ddragon');


module.exports.get = function(req, res) {
  async.waterfall([
    ddragon.currentPatch.bind(null, 'euw'),
    function loadSummonerData(currentPatch, cb) {
      summonerInfo.getSummonerData(req.query.summoner, req.query.region, rarity.carry(currentPatch, cb));
    },
    function sendData(currentPatch, data, cb) {
      if(!data) {
        var err = new Error("Summoner does not exist!");
        err.statusCode = 404;

        return cb(err);
      }

      data.profileIcon = "https://ddragon.leagueoflegends.com/cdn/" + currentPatch + "/img/profileicon/" + data.profileIconId + ".png";

      res.send(data);

      cb();
    }
  ],
  function(err) {
    if(err) {
      errorLogger(err, {req: req, log: log});
      res.status(err.statusCode || 500).send(err.toString());

      return;
    }

  });

};
