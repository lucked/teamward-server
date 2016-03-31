"use strict";

var async = require("async");
var rarity = require("rarity");
var log = require('debug')('gss:handler:summoner-data');
var summonerInfo = require('../../riot-api/summoner-info.js');
var ddragon = require('../../ddragon');


module.exports.get = function(req, res) {
  async.waterfall([
    ddragon.currentPatch.bind(null, 'euw'),
    function loadSummonerData(currentPatch, cb) {
      summonerInfo.getSummonerData(req.query.summoner, req.query.region, rarity.carry(currentPatch, cb));
    }
  ], function(err, currentPatch, data) {
        if(err) {
          log(err);
          console.log(err.toString());
          res.status(err.statusCode || 500).send(err.toString());
          return;
        }

        data.profileIcon = "http://ddragon.leagueoflegends.com/cdn/" + currentPatch + "/img/profileicon/" + data.profileIconId + ".png";

        res.send(data);
      });

};
