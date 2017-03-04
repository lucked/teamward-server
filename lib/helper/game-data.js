'use strict';
var async = require("async");
var mongoose = require("mongoose");

var config = require('../../config');
var summonerInfoApi = require('../riot-api/summoner-info');
var gameInfoApi = require('../riot-api/game-info');
var ddragon = require('../ddragon');
var log = require("debug")("teamward:game-data");
var premadeHelper = require('./premade');
var cache = require('../riot-api/cache');
var duration = require('../helper/duration');


// Wrapper to keep going when some non essential part of the API are down
var errForgiver = function errForgiver(cb) {
  return function(err, data) {
    if(err) {
      log("Got a non-blocking error", err);

      // Reapply and skip the error, but return null as the data
      cb(null, null);

      return;
    }

    cb(null, data);

  };
};


// pluck the participant object to only return summonerId
var pluckSummonerIds = function pluckSummonerIds(participant) {
  return participant.summonerId;
};


var computeAllGameData = function computeAllGameData(gameInfo, region, cb) {
  var Premade = mongoose.model('Premade');
  var Game = mongoose.model('Game');

  var gameId = gameInfo.gameId;
  var secondaryLog = require("debug")("teamward:game-data:" + gameId);

  var summonerIds = gameInfo.participants.map(pluckSummonerIds);

  async.auto({
    preloadChampionData: function preloadChampionData(cb) {
      // Pre-warm the cache!
      // Only happens once per worker
      async.series([
        ddragon.getChampionData.bind(this, 'euw', 420),
        ddragon.getSummonerSpellData.bind(this, 'euw', 4),
      ], cb);
    },
    rawSummonersChampionData: function rawSummonersChampionData(cb) {
      async.map(gameInfo.participants, function(participant, cb) {
        // This is not critical and can be skipped if this part of the API is down
        summonerInfoApi.getChampions(participant.summonerId, region, errForgiver(cb));
      }, cb);
    },
    summonersChampionData: ['rawSummonersChampionData', function summonersChampionData(res, cb) {
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

      var currentChampionData = gameInfo.participants.map(function(participant) {
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
      summonerInfoApi.getCurrentRanks(summonerIds, region, cb);
    },
    rankedSummonerData: ['rawRankedSummonerData', function rankedSummonerData(res, cb) {
      secondaryLog("Done loading ranked summoner data.");

      var rankedData = gameInfo.participants.map(function(participant) {
        var summonerId = participant.summonerId;

        if(!res.rawRankedSummonerData[summonerId]) {
          return null;
        }

        var rankedData = res.rawRankedSummonerData[summonerId][0];
        if(!rankedData || !rankedData.entries) {
          return null;
        }

        for(var i = 0; i < rankedData.entries.length; i += 1) {
          if(parseInt(rankedData.entries[i].playerOrTeamId) === summonerId) {
            return {
              tier: rankedData.tier,
              queue: rankedData.queue,
              division: rankedData.entries[i].division,
            };
          }
        }

        return null;
      });

      cb(null, rankedData);
    }],
    rawSummonersData: function rawSummonersData(cb) {
      summonerInfoApi.getSummonersData(summonerIds, region, cb);
    },
    summonersData: ['rawSummonersData', function summonersData(res, cb) {
      secondaryLog("Done loading summoner data.");
      var summonersData = gameInfo.participants.map(function(participant) {
        var summonerId = participant.summonerId;

        if(!res.rawSummonersData[summonerId]) {
          return null;
        }

        return res.rawSummonersData[summonerId];
      });


      cb(null, summonersData);
    }],
    rawMatchHistoryData: function rawMatchHistoryData(cb) {
      async.map(gameInfo.participants, function(participant, cb) {
        // This is not critical and can be skipped if this part of the API is down
        summonerInfoApi.getRecentMatches(participant.summonerId, region, errForgiver(cb));
      }, cb);
    },
    matchHistoryData: ['rawMatchHistoryData', function matchHistoryData(res, cb) {
      secondaryLog("Done loading match history data.");

      // First reduce: build an object,
      // keys are summonerId,
      // value an array of games
      var matchData = res.rawMatchHistoryData.reduce(function(acc, matchHistory) {
        if(matchHistory && matchHistory.games && matchHistory.games.length > 0) {
          acc[matchHistory.summonerId] = {
            total: matchHistory.games.length,
            win: matchHistory.games.filter(function(game) {
              return game.stats.win;
            }).length,
            loss: matchHistory.games.filter(function(game) {
              return !game.stats.win;
            }).length,
            average_time_between_games: Math.round((new Date().getTime() - matchHistory.games[matchHistory.games.length - 1].createDate) / (1000 * matchHistory.games.length))
          };

        }
        return acc;
      }, {});

      cb(null, matchData);
    }],
    historyPremadeData: ['rawMatchHistoryData', function historyPremadeData(res, cb) {
      // First reduce: build an object,
      // keys are summonerId,
      // value an array of people currently in the same game with whom this summoner shares a previous match in the same team
      var historyPremadeData = res.rawMatchHistoryData.reduce(function(acc, matchHistory) {
        if(matchHistory && matchHistory.games && matchHistory.games.length > 0) {
          // Retrieve ID of team summoner is currently in
          var currentTeamId = gameInfo.participants.find(function(participant) {
            return participant.summonerId === matchHistory.summonerId;
          }).teamId;

          // Retrieve IDs of summoners in same team as current player
          var teamMates = gameInfo.participants.filter(function(participant) {
            return participant.teamId === currentTeamId;
          }).map(pluckSummonerIds);

          // Build a set of known friends
          acc[matchHistory.summonerId] = matchHistory.games.reduce(function(acc, game) {
            var previousTeamId = game.teamId;

            // fellowPlayers can be empty when doing a custom game with yourself.
            var currentlyPlayingWith = (game.fellowPlayers || []).filter(function(player) {
              return player.teamId === previousTeamId && teamMates.indexOf(player.summonerId) !== -1;
            }).map(pluckSummonerIds);

            currentlyPlayingWith.forEach(function(summonerId) {
              acc.add(summonerId);
            });

            return acc;
          }, new Set());
        }

        return acc;
      }, {});

      // Ensure we have a key for each game participant
      summonerIds.forEach(function(summonerId) {
        if(!historyPremadeData[summonerId]) {
          historyPremadeData[summonerId] = new Set();
        }
      });

      cb(null, historyPremadeData);
    }],
    dbPremadeData: function dbPremadeData(cb) {
      Premade.loadKnownPremadesFromDB(summonerIds, region, cb);
    },
    premadeData: ['historyPremadeData', 'dbPremadeData', function premadeData(res, cb) {
      // Merge premades data from history and from DB
      var mergedData = res.historyPremadeData;
      Object.keys(res.dbPremadeData).forEach(function(key) {
        if(!mergedData[key]) {
          mergedData[key] = new Set();
        }

        res.dbPremadeData[key].forEach(mergedData[key].add.bind(mergedData[key]));
      });

      var premadeData = {};
      Object.keys(mergedData).forEach(function(key) {
        premadeData[key] = {
          knownPlayers: mergedData[key],
          // Retrieve team ID for summoner
          teamId: gameInfo.participants.find(function(participant) {
            return participant.summonerId === parseInt(key);
          }).teamId,
        };
      });

      var premade = premadeHelper.getPremade(premadeData);
      cb(null, premade);
    }],
    savePremadeDataToDb: ['premadeData', function savePremadeDataToDb(res, cb) {
      Premade.savePremadesToDB(res.premadeData, region, cb);
    }],
    saveGamesToDb: ['rawMatchHistoryData', function saveGamesToDb(res, cb) {
      Game.saveGamesToDB(res.rawMatchHistoryData, region, cb);
    }],
    lastSeasonRankedSummonerData: ['rankedSummonerData', 'matchHistoryData', function rawLastSeasonRankedSummonerData(res, cb) {
      var currentRankedData = res.rankedSummonerData;
      var index = -1;
      async.map(gameInfo.participants, function(participant, cb) {
        index += 1;
        if(currentRankedData[index] !== null) {
          // Already playing ranked this season, no need to fetch last season information
          return cb(null, null);
        }

        // Otherwise, find a game
        var matchHistory = res.rawMatchHistoryData[index];
        if(matchHistory && matchHistory.games && matchHistory.games.length > 0) {
          log("Finding last season rank for currently unranked player " + participant.summonerId);
          // Get the first match
          var sampleMatchId = matchHistory.games[0].gameId;
          var sampleMatchTeamPlayed = matchHistory.games[0].teamId;
          var sampleMatchChampionPlayed = matchHistory.games[0].championId;
          gameInfoApi.getExistingGame(sampleMatchId, region, function(err, matchData) {
            if(err) {
              // Log the error, but skip it, it's not important if this part of the API is down
              log("Non blocking error on match #" + sampleMatchId + " (for summoner " + participant.summonerId + ")", err);
              return cb(null, null);
            }

            // Find the highestAchievedSeasonTier for this participant
            var correctParticipant = matchData.participants.find(function(p) {
              // participandId is anonymized here, so we need to find him by champion and hope he's not playing One For All!
              return p.championId === sampleMatchChampionPlayed && p.teamId === sampleMatchTeamPlayed;
            });

            if(!correctParticipant) {
              log("Can't find participant " + participant.summonerId + "!");
              // Should never happen: participant not found in his own game?!
              return cb(null, null);
            }

            // We now have the data we're looking for.
            cb(null, correctParticipant.highestAchievedSeasonTier);
          });
        }
        else {
          return cb(null, null);
        }
      }, cb);
    }],
    finalResult: ['summonersChampionData', 'rankedSummonerData', 'preloadChampionData', 'summonersData', 'matchHistoryData', 'lastSeasonRankedSummonerData', function finalResult(res, cb) {
      secondaryLog("Building final result...");

      var counter = 0;
      async.map(gameInfo.participants, function(participant, cb) {

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
            level: res.summonersData[counter] ? res.summonersData[counter].summonerLevel : 0
          };

          allData.champion = {
            id: ddragonRes.champion.key,
            name: ddragonRes.champion.name,
            image: ddragonRes.champion.image_url,
            splash: ddragonRes.champion.splash_url,
            gg: ddragonRes.champion.gg_url,
            ad: ddragonRes.champion.info.attack,
            ap: ddragonRes.champion.info.magic,
            mastery: res.summonersChampionData[counter] ? res.summonersChampionData[counter].championLevel : 0,
            points: res.summonersChampionData[counter] ? res.summonersChampionData[counter].championPoints : 0,
            champion_rank: res.summonersChampionData[counter] ? res.summonersChampionData[counter].rank : -1,
          };

          allData.known_champions = res.summonersChampionData[counter] ? res.summonersChampionData[counter].rankTotal : -1,

          allData.spell_d = {
            id: ddragonRes.spell1.id,
            name: ddragonRes.spell1.name,
            image: ddragonRes.spell1.image_url,
          };
          allData.spell_f = {
            id: ddragonRes.spell2.id,
            name: ddragonRes.spell2.name,
            image: ddragonRes.spell2.image_url,
          };

          allData.current_season_rank = {
            tier: res.rankedSummonerData[counter] ? res.rankedSummonerData[counter].tier : '',
            division: res.rankedSummonerData[counter] ? res.rankedSummonerData[counter].division : '',
            queue: res.rankedSummonerData[counter] ? res.rankedSummonerData[counter].queue : ''
          };

          allData.last_season_rank = res.lastSeasonRankedSummonerData[counter];

          allData.recent_games = res.matchHistoryData[participant.summonerId];
          counter += 1;
          cb(null, allData);
        });
      }, cb);

    }]
  }, function(err, res) {
    if(err) {
      return cb(err);
    }

    secondaryLog("... and formatting teams");
    // Find all teamsIds
    var teamIds = res.finalResult.reduce(function(acc, i) {
      if(acc.indexOf(i.team_id) === -1) {
        acc.push(i.team_id);
      }
      return acc;
    }, []);

    teamIds.sort();


    var teams = teamIds.map(function(teamId) {
      return {
        team_id: teamId,
        premades: res.premadeData[teamId],
        players: res.finalResult.filter(function(p) {
          if(p.team_id === teamId) {
            delete p.team_id;
            return true;
          }
          return false;
        })
      };
    });

    cb(err, {
      game_id: gameInfo.gameId,
      map_id: gameInfo.mapId,
      game_start_time: gameInfo.gameStartTime ? gameInfo.gameStartTime : new Date().getTime(), // Game start time is empty during the first three minutes
      game_mode: gameInfo.gameMode,
      game_type: gameInfo.gameType,
      teams: teams
    });
  });
};


module.exports.buildExternalGameData = function buildExternalGameData(gameInfo, region, cb) {
  var gameId = gameInfo.gameId;
  var cacheKey = "teamward-" + gameId;


  if(gameInfo.participants.length > 10) {
    return cb(new Error("Hexakill mode not supported for now :("));
  }

  // Try to find the game in cache... just in case!
  cache.get(region, cacheKey, function(err, data) {
    if(err || !data || gameInfo._noCache || config.nodeEnv !== 'production') {
      log("Retrieving game data for game #" + gameId + " (" + region + ")");
      computeAllGameData(gameInfo, region, function(err, data) {
        if(!err) {
          cache.set(region, cacheKey, duration.THIRTY_MINUTES, data);
        }

        cb(err, data);
      });
      return;
    }

    // We don't have to do anything. Just relax and enjoy.
    log("Serving from cache game data for game #" + gameId + " (" + region + ")");
    cb(null, data);
  });
};
