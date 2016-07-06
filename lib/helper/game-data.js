'use strict';
var async = require("async");

var summonerInfo = require('../riot-api/summoner-info');
var ddragon = require('../ddragon');
var log = require("debug")("teamward:game-data");


module.exports.buildExternalGameData = function buildExternalGameData(gameInfo, region, cb) {
  // Spectate game use gameId, match history uses matchId.
  var gameId = gameInfo.gameId || gameInfo.matchId;
  var secondaryLog = require("debug")("teamward:game-data:" + gameId);

  log("Retrieving game data for game #" + gameId + " (" + region + ")");

  if(gameInfo.participants.length > 10) {
    return cb(new Error("Hexakill mode not supported for now :("));
  }

  var summonerIds = gameInfo.participants.map(function(participant) {
    return participant.summonerId;
  });

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
      async.map(gameInfo.participants, function(participant, cb) {
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
      summonerInfo.getCurrentRanks(summonerIds, region, cb);
    },
    rankedSummonerData: ['rawRankedSummonerData', function rankedSummonerData(cb, res) {
      secondaryLog("Done loading ranked summoner data.");

      var rankedData = gameInfo.participants.map(function(participant) {
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
      summonerInfo.getSummonersData(summonerIds, region, cb);
    },
    summonersData: ['rawSummonersData', function summonersData(cb, res) {
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
        summonerInfo.getRecentMatches(participant.summonerId, region, cb);
      }, cb);
    },
    matchHistoryData: ['rawMatchHistoryData', function matchHistoryData(cb, res) {
      secondaryLog("Done loading match history data.");

      // First reduce: build an object,
      // keys are summonerId,
      // value an array of games
      var matchData = res.rawMatchHistoryData.reduce(function(acc, matchHistory) {
        if(matchHistory && matchHistory.games.length > 0) {
          acc[matchHistory.summonerId] = {
            total: matchHistory.games.length,
            win: matchHistory.games.filter(function(game) {
              return game.stats.win;
            }).length,
            loss: matchHistory.games.filter(function(game) {
              return !game.stats.win;
            }).length,
            average_time_between_games: Math.round((new Date().getTime() - matchHistory.games[matchHistory.games.length - 1].createDate) / 1000 * matchHistory.games.length)
          };

        }
        return acc;
      }, {});

      cb(null, matchData);
    }],
    premadeData: ['rawMatchHistoryData', function premadeData(cb, res) {
      // First reduce: build an object,
      // keys are summonerId,
      // value an array of people currently in the same game with whom this summoner shares a previous match in the same team
      var premadeData = res.rawMatchHistoryData.reduce(function(acc, matchHistory) {
        if(matchHistory && matchHistory.games.length > 0) {

          // Retrieve ID of team summoner is currently in
          var currentTeamId = gameInfo.participants.find(function(participant) {
            return participant.summonerId === matchHistory.summonerId;
          }).teamId;

          // Retrieve IDs of summoner in same team as current player
          var summonerIdsInCurrentTeam = gameInfo.participants.filter(function(participant) {
            return participant.teamId === currentTeamId;
          }).map(function(participant) {
            return participant.summonerId;
          });

          acc[matchHistory.summonerId] = {
            teamId: currentTeamId,
            knownPlayers: matchHistory.games.reduce(function(acc, game) {
              var previousTeamId = game.teamId;

              // fellowPlayers can be empty when doing a custom game with yourself.
              var currentlyPlayingWith = (game.fellowPlayers || []).filter(function(player) {
                return player.teamId === previousTeamId && summonerIdsInCurrentTeam.indexOf(player.summonerId) !== -1;
              }).map(function(participant) {
                return participant.summonerId;
              }, []);

              currentlyPlayingWith.forEach(function(summonerId) {
                acc.add(summonerId);
              });

              return acc;
            }, new Set())
          };
        }

        return acc;
      }, {});

      // Second part: build an easy to use object
      // by grouping the sets through common keys
      // Not that sets are not transitive (A plays with B only in dataset,
      // but C plays with A so set should be {A,B,C})
      var premade = {};

      Object.keys(premadeData).forEach(function(summonerId) {
        var summonerPremadeData = premadeData[summonerId];
        if(!premade[summonerPremadeData.teamId]) {
          premade[summonerPremadeData.teamId] = [];
        }

        var knownPremadesForTeam = premade[summonerPremadeData.teamId];
        // Find a group where user already is
        var currentGroup = knownPremadesForTeam.find(function(premade) {
          // We already have a premade with this summoner: ez
          if(premade.has(summonerId)) {
            return true;
          }

          // But let's also check we don't have a premade with someone else
          // (can happen because last 10 games are not the same for everyone, and if A plays more game than B,
          // B won't appear in A list even though they are premade)
          return Array.from(summonerPremadeData.knownPlayers.values()).some(function(summonerId) {
            return premade.has(summonerId.toString());
          });
        });

        if(!currentGroup) {
          currentGroup = new Set();
          knownPremadesForTeam.push(currentGroup);
        }

        currentGroup.add(summonerId.toString());
        Array.from(summonerPremadeData.knownPlayers.values()).forEach(function(knownPlayer) {
          currentGroup.add(knownPlayer.toString());
        });
      });

      // We're nearly done! Let's just order by premade size
      // and replace Set with standard arrays
      Object.keys(premade).forEach(function(teamId) {
        var premades = premade[teamId];
        premades.sort(function(p1, p2) {
          // Bigger size first
          return p2.size - p1.size;
        });

        premade[teamId] = premades.map(function(someSet) {
          return Array.from(someSet.values());
        });
      });

      cb(null, premade);
    }],
    finalResult: ['summonersChampionData', 'rankedSummonerData', 'preloadChampionData', 'summonersData', 'matchHistoryData', function buildFinalResult(cb, res) {
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
            level: res.summonersData[counter].summonerLevel
          };

          allData.champion = {
            id: ddragonRes.champion.key,
            name: ddragonRes.champion.name,
            image: ddragonRes.champion.image_url,
            ad: ddragonRes.champion.info.attack,
            ap: ddragonRes.champion.info.magic,
            mastery: res.summonersChampionData[counter] ? res.summonersChampionData[counter].championLevel : 0,
            points: res.summonersChampionData[counter] ? res.summonersChampionData[counter].championPoints : 0,
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
      game_id: gameInfo.gameId,
      map_id: gameInfo.mapId,
      game_start_time: gameInfo.gameStartTime ? gameInfo.gameStartTime : new Date().getTime(), // Game start time is empty during the first three minutes
      game_mode: gameInfo.gameMode,
      game_type: gameInfo.gameType,

      teams: teamIds.map(function(teamId) {
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
      })
    });
  });
};
