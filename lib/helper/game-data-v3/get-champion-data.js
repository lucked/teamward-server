"use strict";
var async = require("async");
var log = require('debug')('teamward:game-data:get-champion-data');

var ddragon = require('../../ddragon/');
var summonerInfoApi = require('../../riot-api/summoner-info-v3.js');

/**
 * @param summonerIdAndChampionInformation is an array [{summonerId: ..., championId: ...}]
 * @param region
 * Return an object in the callback,
 * keys are summonerIds,
 * values an object with champion details
 */
module.exports = function getChampionData(summonerIdAndChampionInformation, region, cb) {
  async.auto({
    ddragonData: function(cb) {
      async.reduce(summonerIdAndChampionInformation, {}, function(acc, participant, cb) {
        ddragon.getChampionData(region, participant.championId, function(err, ddragonData) {
          acc[participant.summonerId] = ddragonData;
          cb(err, acc);
        });
      }, cb);
    },
    championMasteries: function(cb) {
      async.reduce(summonerIdAndChampionInformation, {}, function(acc, participant, cb) {
        // This is not critical and can be skipped if this part of the API is down
        summonerInfoApi.getChampions(participant.summonerId, region, function(err, championsList) {
          if(err) {
            log("Skipping error:", err);
            return cb(null, acc);
          }

          if(championsList) {
            var championData = championsList.find((c, i) => {
              // Rank is 1-indexed
              c.rank = i + 1;
              c.rankTotal = championsList.length;
              return c.championId === participant.championId;
            });
            acc[participant.summonerId] = championData;
          }
          cb(null, acc);
        });
      }, cb);
    },
  }, function combine(err, res) {
    if(err) {
      return cb(err);
    }

    var finalResult = summonerIdAndChampionInformation.reduce(function(acc, participant) {
      var ddragonData = res.ddragonData[participant.summonerId];

      var championData = {
        id: participant.championId,
        name: ddragonData.name,
        image: ddragonData.image_url,
        splash: ddragonData.splash_url,
        gg: ddragonData.gg_url,
        ad: ddragonData.info.attack,
        ap: ddragonData.info.magic,
      };

      // Merge champion masteries data
      if(res.championMasteries[participant.summonerId]) {
        var championMastery = res.championMasteries[participant.summonerId];
        championData.mastery = championMastery.championLevel;
        championData.points = championMastery.championPoints;
        championData.champion_rank = championMastery.rank;
      }

      acc[participant.summonerId] = championData;
      return acc;
    }, {});


    cb(null, finalResult);
  });
};
