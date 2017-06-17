'use strict';
var async = require("async");
var log = require("debug")("teamward:game-data");

var getChampionData = require('./get-champion-data');
var getSummonerData = require('./get-summoner-data');

module.exports.buildExternalGameData = function buildExternalGameData(gameInfo, region, cb) {
  log("Retrieving game data for game #" + gameInfo.gameId + " (" + region + ")");


  // Each function should follow the same convention for its cb: err, {summId: value, summId2: ...}
  async.auto({
    championMasteries: function(cb) {
      var summonerIdAndChampionInformation = gameInfo.participants.map(p => {
        return {
          summonerId: p.summonerId,
          championId: p.championId
        };
      });
      getChampionData(summonerIdAndChampionInformation, cb);
    },
    summonerData: function(cb) {
      getSummonerData(gameInfo.participants, cb);
    },
    teamward: function(cb) {
    },
    premades: function(cb) {
    }
  });
};
