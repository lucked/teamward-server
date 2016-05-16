"use strict";

var async = require("async");
var rarity = require("rarity");
var log = require('debug')('teamward:handler:summoner-data');
var summonerInfo = require('../../riot-api/summoner-info.js');
var ddragon = require('../../ddragon');


module.exports.get = function(req, res) {
  async.waterfall([
    ddragon.currentPatch.bind(null, 'euw'),
    function loadSummonerData(currentPatch, cb) {
      summonerInfo.getSummonerData(req.query.summoner, req.query.region, rarity.carry(currentPatch, cb));
    }
  ],
  function(err, currentPatch, data) {
    if(data && data.status_code === 404) {
      err = new Error("Summoner does not exist!");
      err.statusCode = 404;
    }

    if(err) {
      log(err);
      res.status(err.statusCode || 500).send(err.toString());
      return;
    }

    data.profileIcon = "http://ddragon.leagueoflegends.com/cdn/" + currentPatch + "/img/profileicon/" + data.profileIconId + ".png";

    res.send(data);
  });

};
