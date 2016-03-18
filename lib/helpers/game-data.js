'use strict';
var async = require("async");

var gameInfo = require('../riot-api/game-info');
var summonerInfo = require('../riot-api/summoner-info');
var ddragon = require('../ddragon');


module.exports = function getGameData(summonerName, region, cb) {
  async.auto({
    mainSummonerData: function getMainSummonerData(cb) {
      summonerInfo.getSummonerData(summonerName, region, cb);
    },
    gameData: ['mainSummonerData', function loadCurrentGame(cb, res) {
      gameInfo.getCurrentGame(res.mainSummonerData.id, region, cb);
    }],
    rawSummonersChampionData: ['gameData', function rawSummonersChampionData(cb, res) {
      async.map(res.gameData.participants, function(participant, cb) {
        summonerInfo.getChampions(participant.summonerId, region, cb);
      }, cb);
    }],
    summonersChampionData: ['rawSummonersChampionData', function summonersChampionData(cb, res) {
      var res = res.rawSummonersChampionData.reduce(function(acc, participant) {
        acc[participant.summonerId] = participant;
        return acc;
      }, {});

      cb(null, res);
    }],
  }, cb);
};
