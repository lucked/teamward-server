'use strict';
var async = require("async");

var gameInfo = require('../riot-api/game-info');
var summonerInfo = require('../riot-api/summoner-info');
var ddragon = require('../ddragon');
var log = require("debug")("gss:game-data");


module.exports = function getGameData(summonerName, region, cb) {
  var secondaryLog = require("debug")("gss:game-data:" + summonerName.toLowerCase());

  log("Retrieving game data for summoner " + summonerName + " (" + region + ")");

  async.auto({
    preloadChampionData: function(cb) {
      // Pre-warm the cache!
      // Only happens once per worker
      async.series([
        ddragon.getChampionData.bind(this, 'euw', 420),
        ddragon.getSummonerSpellData.bind(this, 'euw', 4),
      ], cb);
    },
    mainSummonerData: function getMainSummonerData(cb) {
      summonerInfo.getSummonerData(summonerName, region, cb);
    },
    rawGameData: ['mainSummonerData', function loadCurrentGame(cb, res) {
      if(!res.mainSummonerData.id) {
        secondaryLog("Summoner does not exist.");

        var error = new Error("Summoner does not exist!");
        error.statusCode = 404;
        cb(error);
      }
      secondaryLog("Got summoner id: " + res.mainSummonerData.id);

      gameInfo.getCurrentGame(res.mainSummonerData.id, region, cb);
    }],
    gameData: ['rawGameData', function ensureInGame(cb, res) {
      if(res.rawGameData.status && res.rawGameData.status.status_code === 404) {
        secondaryLog("Not in a game right now.");

        var error = new Error("Summoner not in game.");
        error.statusCode = 404;
        return cb(error);
      }
      else if(!res.rawGameData.gameId) {
        var error2 = new Error("Issues with the Riot API :(");
        return cb(error2);
      }
      else {
        secondaryLog("In game #" + res.rawGameData.gameId + " (" + res.rawGameData.gameMode + " / " + res.rawGameData.gameType + ")");
        cb(null, res.rawGameData);
      }
    }],
    rawSummonersChampionData: ['gameData', function rawSummonersChampionData(cb, res) {
      async.map(res.gameData.participants, function(participant, cb) {
        summonerInfo.getChampions(participant.summonerId, region, cb);
      }, cb);
    }],
    summonersChampionData: ['rawSummonersChampionData', function summonersChampionData(cb, res) {
      secondaryLog("Done loading champion data.");

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
      secondaryLog("Done loading ranked summoner data.");

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
    rawSummonersData: ['gameData', function rawSummonersData(cb, res) {
      // List all participants
      var summonerIds = res.gameData.participants.map(function(participant) {
        return participant.summonerId;
      });

      summonerInfo.getSummonersData(summonerIds, region, cb);
    }],
    summonersData: ['rawSummonersData', function summonersData(cb, res) {
      secondaryLog("Done loading summoner data.");

      var summonersData = res.gameData.participants.map(function(participant) {
        var summonerId = participant.summonerId;

        if(!res.rawSummonersData[summonerId]) {
          return null;
        }

        return res.rawSummonersData[summonerId];
      });


      cb(null, summonersData);
    }],
    finalResult: ['summonersChampionData', 'rankedSummonerData', 'preloadChampionData', function buildFinalResult(cb, res) {
      secondaryLog("Building final result...");

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
      map_id: res.gameData.mapId,
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
