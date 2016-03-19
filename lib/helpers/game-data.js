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
      // First reduce: build an object,
      // keys are summonerId,
      // value an array of all champs
      var championData = res.rawSummonersChampionData.reduce(function(acc, championsList) {
        if(championsList.length > 0) {
          acc[championsList[0].playerId] = championsList;
        }
        return acc;
      }, {});

      var currentChampionData = res.gameData.participants.map(function(participant) {
        var summonerId = participant.summonerId;
        if(!championData[summonerId]) {
          return null;
        }

        for(var i = 0; i < championData[summonerId].length; i += 1) {
          if(championData[summonerId][i].championId === participant.championId) {
            // Is it his main champ?
            // Add one to get it 1-indexed.
            championData[summonerId][i].rank = i + 1;
            championData[summonerId][i].rankTotal = championData[summonerId].length;
            return championData[summonerId][i];
          }
        }

        return null;
      });

      cb(null, currentChampionData);

    }],
    rawRankedSummonerData: ['gameData', function rawRankedSummonerData(cb, res) {
      // List all participants
      var summonerIds = res.gameData.participants.map(function(participant) {
        return participant.summonerId;
      });

      summonerInfo.getCurrentRanks(summonerIds, region, cb);
    }],
    rankedSummonerData: ['rawRankedSummonerData', function rankedSummonerData(cb, res) {
      var rankedData = res.gameData.participants.map(function(participant) {
        var summonerId = participant.summonerId;

        if(!res.rawRankedSummonerData[summonerId]) {
          return null;
        }

        var rankedData = res.rawRankedSummonerData[summonerId][0];
        if(!rankedData) {
          return null;
        }

        for(var i = 0; i < rankedData.entries.length; i += 1) {
          if(parseInt(rankedData.entries[i].playerOrTeamId) === summonerId) {
            return {
              tier: rankedData.tier,
              division: rankedData.entries[i].division
            };
          }
        }

        throw new Error("Missing player id in ranked data!");
      });

      cb(null, rankedData);
    }],
    preloadChampionData: function(cb) {
      async.series([
        ddragon.getChampionData.bind(this, 'euw', 420),
        ddragon.getSummonerSpellData.bind(this, 'euw', 4),
      ], cb);
    },
    finalResult: ['summonersChampionData', 'rankedSummonerData', 'preloadChampionData', function buildFinalResult(cb, res) {
      var counter = 0;
      async.map(res.gameData.participants, function(participant, cb) {

        var allData = {};
        async.parallel({
          champion: ddragon.getChampionData.bind(this, 'euw', participant.championId),
          spell1: ddragon.getSummonerSpellData.bind(this, 'euw', participant.spell1Id),
          spell2: ddragon.getSummonerSpellData.bind(this, 'euw', participant.spell2Id)
        }, function(err, ddragonRes) {
          if(err) {
            return cb(err);
          }

          allData.champion = {
            name: ddragonRes.champion.name,
            image: ddragonRes.champion.image_url,
            level: res.summonersChampionData[counter] ? res.summonersChampionData[counter].championLevel : 0,
            champion_rank: res.summonersChampionData[counter] ? res.summonersChampionData[counter].rank : -1,
          };
          allData.known_champions = res.summonersChampionData[counter] ? res.summonersChampionData[counter].rankTotal : -1,

          allData.summoner = {
            name: participant.summonerName,
            level: '?'
          };

          allData.spellD = {
            name: ddragonRes.spell1.name,
            image: ddragonRes.spell1.image_url,
          };
          allData.spellF = {
            name: ddragonRes.spell2.name,
            image: ddragonRes.spell2.image_url,
          };

          allData.currentSeasonRank = {
            tier: res.rankedSummonerData[counter] ? res.rankedSummonerData[counter].tier : '',
            division: res.rankedSummonerData[counter] ? res.rankedSummonerData[counter].division : ''
          };

          counter += 1;
          cb(null, allData);
        });
      }, cb);

    }]
  }, function(err, res) {
    if(err) {
      return cb(err);
    }

    cb(err, {
      mapId: res.gameData.mapId,
      participants: res.finalResult
    });
  });
};
