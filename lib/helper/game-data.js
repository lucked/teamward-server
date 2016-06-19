'use strict';
var async = require("async");

var summonerInfo = require('../riot-api/summoner-info');
var ddragon = require('../ddragon');
var log = require("debug")("teamward:game-data");


module.exports.buildExternalGameData = function getAllGameData(gameData, region, cb) {
  // Spectate game use gameId, match history uses matchId.
  var gameId = gameData.gameId || gameData.matchId;
  var secondaryLog = require("debug")("teamward:game-data:" + gameId);

  log("Retrieving game data for game #" + gameId + " (" + region + ")");

  async.auto({
    preloadChampionData: function(cb) {
      // Pre-warm the cache!
      // Only happens once per worker
      async.series([
        ddragon.getChampionData.bind(this, 'euw', 420),
        ddragon.getSummonerSpellData.bind(this, 'euw', 4),
      ], cb);
    },

    rawSummonersChampionData: function rawSummonersChampionData(cb) {
      async.map(gameData.participants, function(participant, cb) {
        summonerInfo.getChampions(participant.summonerId, region, cb);
      }, cb);
    },
    summonersChampionData: ['rawSummonersChampionData', function summonersChampionData(cb, res) {
      secondaryLog("Done loading champion data.");

      // First reduce: build an object,
      // keys are summonerId,
      // value an array of all champs
      var championData = res.rawSummonersChampionData.reduce(function(acc, championsList) {
        if(championsList && championsList.length > 0) {
          acc[championsList[0].playerId] = championsList;
        }
        return acc;
      }, {});

      var currentChampionData = gameData.participants.map(function(participant) {
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
    rawRankedSummonerData: function rawRankedSummonerData(cb) {
      // List all participants
      var summonerIds = gameData.participants.map(function(participant) {
        return participant.summonerId;
      });

      summonerInfo.getCurrentRanks(summonerIds, region, cb);
    },
    rankedSummonerData: ['rawRankedSummonerData', function rankedSummonerData(cb, res) {
      secondaryLog("Done loading ranked summoner data.");

      var rankedData = gameData.participants.map(function(participant) {
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

        return null;
      });

      cb(null, rankedData);
    }],
    rawSummonersData: function rawSummonersData(cb) {
      // List all participants
      var summonerIds = gameData.participants.map(function(participant) {
        return participant.summonerId;
      });

      summonerInfo.getSummonersData(summonerIds, region, cb);
    },
    summonersData: ['rawSummonersData', function summonersData(cb, res) {
      secondaryLog("Done loading summoner data.");

      var summonersData = gameData.participants.map(function(participant) {
        var summonerId = participant.summonerId;

        if(!res.rawSummonersData[summonerId]) {
          return null;
        }

        return res.rawSummonersData[summonerId];
      });


      cb(null, summonersData);
    }],
    finalResult: ['summonersChampionData', 'rankedSummonerData', 'preloadChampionData', 'summonersData', function buildFinalResult(cb, res) {
      secondaryLog("Building final result...");

      var counter = 0;
      async.map(gameData.participants, function(participant, cb) {

        var allData = {};
        async.parallel({
          champion: ddragon.getChampionData.bind(this, 'euw', participant.championId),
          spell1: ddragon.getSummonerSpellData.bind(this, 'euw', participant.spell1Id),
          spell2: ddragon.getSummonerSpellData.bind(this, 'euw', participant.spell2Id)
        }, function(err, ddragonRes) {
          if(err) {
            return cb(err);
          }

          allData.team_id = participant.teamId;

          allData.summoner = {
            id: participant.summonerId,
            name: participant.summonerName,
            level: res.summonersData[counter].summonerLevel
          };

          allData.champion = {
            id: ddragonRes.champion.key,
            name: ddragonRes.champion.name,
            image: ddragonRes.champion.image_url,
            ad: ddragonRes.champion.info.attack,
            ap: ddragonRes.champion.info.magic,
            mastery: res.summonersChampionData[counter] ? res.summonersChampionData[counter].championLevel : 0,
            champion_rank: res.summonersChampionData[counter] ? res.summonersChampionData[counter].rank : -1,
          };
          allData.known_champions = res.summonersChampionData[counter] ? res.summonersChampionData[counter].rankTotal : -1,


          allData.spell_d = {
            name: ddragonRes.spell1.name,
            image: ddragonRes.spell1.image_url,
          };
          allData.spell_f = {
            name: ddragonRes.spell2.name,
            image: ddragonRes.spell2.image_url,
          };

          allData.current_season_rank = {
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

    // Find all teamsIds
    var teamIds = res.finalResult.reduce(function(acc, i) {
      if(acc.indexOf(i.team_id) === -1) {
        acc.push(i.team_id);
      }
      return acc;
    }, []);

    teamIds.sort();

    secondaryLog("... and formatting teams");

    cb(err, {
      game_id: gameData.gameId,
      map_id: gameData.mapId,
      game_start_time: gameData.gameStartTime,
      game_mode: gameData.gameMode,
      game_type: gameData.gameType,

      teams: teamIds.map(function(teamId) {
        return {
          team_id: teamId,
          players: res.finalResult.filter(function(p) {
            return p.team_id === teamId;
          })
        };
      })
    });
  });
};
