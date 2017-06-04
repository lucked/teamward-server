'use strict';
var async = require("async");
var mongoose = require("mongoose");

var log = require("debug")("teamward:game-data");
var config = require('../../../config');
var summonerInfoApi = require('../../riot-api/summoner-info');
var ddragon = require('../../ddragon');
var cache = require('../../riot-api/cache');
var duration = require('../../helper/duration');

var summonersChampionData = require('./summoners-champion-data.js');
var rankedSummonerData = require('./ranked-summoner-data.js');
var summonersData = require('./summoners-data.js');
var matchHistoryData = require('./match-history-data.js');
var historyPremadeData = require('./history-premade-data.js');
var premadeData = require('./premade-data.js');
var queueGamesForDownload = require('./queue-games-for-download.js');
var lastSeasonRankedSummonerData = require('./last-season-ranked-summoner-data.js');
var teamwardUsers = require('./teamward-users.js');


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
    summonersChampionData: ['rawSummonersChampionData', function(res, cb) {
      // Properly format champion mastery data (for current summoner-champion couples)
      summonersChampionData(gameInfo, res.rawSummonersChampionData, cb);
    }],
    rawRankedSummonerData: function rawRankedSummonerData(cb) {
      summonerInfoApi.getCurrentRanks(summonerIds, region, cb);
    },
    rankedSummonerData: ['rawRankedSummonerData', function(res, cb) {
      // Properly format ranked summoners data (tier, rank) in an array
      rankedSummonerData(gameInfo, res.rawRankedSummonerData, cb);
    }],
    rawSummonersData: function rawSummonersData(cb) {
      summonerInfoApi.getSummonersData(summonerIds, region, cb);
    },
    summonersData: ['rawSummonersData', function(res, cb) {
      // Properly format summoners data (name, level) in an array
      summonersData(gameInfo, res.rawSummonersData, cb);
    }],
    rawMatchHistoryData: function rawMatchHistoryData(cb) {
      async.map(gameInfo.participants, function(participant, cb) {
        // This is not critical and can be skipped if this part of the API is down
        summonerInfoApi.getRecentMatches(participant.summonerId, region, errForgiver(cb));
      }, cb);
    },
    teamwardUsers: function findTeamwardUsers(cb) {
      teamwardUsers(region, summonerIds, cb);
    },
    matchHistoryData: ['rawMatchHistoryData', function(res, cb) {
      // Build list of games for each summoner
      matchHistoryData(res.rawMatchHistoryData, cb);
    }],
    historyPremadeData: ['rawMatchHistoryData', function(res, cb) {
      // Build premades from last 10 games
      historyPremadeData(gameInfo, summonerIds, res.rawMatchHistoryData, pluckSummonerIds, cb);
    }],
    queueGamesForDownload: ['rawMatchHistoryData', function(res, cb) {
      queueGamesForDownload(res.rawMatchHistoryData, region, cb);
    }],
    dbPremadeData: function dbPremadeData(cb) {
      Premade.loadKnownPremadesFromDB(summonerIds, region, cb);
    },
    premadeData: ['historyPremadeData', 'dbPremadeData', function(res, cb) {
      // Merge data from DB and from last games, and guess the premades.
      premadeData(gameInfo, res.historyPremadeData, res.dbPremadeData, cb);
    }],
    savePremadeDataToDb: ['premadeData', function savePremadeDataToDb(res, cb) {
      Premade.savePremadesToDB(res.premadeData, region, cb);
    }],
    lastSeasonRankedSummonerData: ['rankedSummonerData', 'matchHistoryData', function(res, cb) {
      // Some summoners aren't ranked. In such case, we download one of their previous games and try to find their ranking from last season.
      lastSeasonRankedSummonerData(gameInfo, res.rawMatchHistoryData, res.rankedSummonerData, region, log, cb);
    }],
    finalResult: ['summonersChampionData', 'teamwardUsers', 'rankedSummonerData', 'preloadChampionData', 'summonersData', 'matchHistoryData', 'lastSeasonRankedSummonerData', function finalResult(res, cb) {

      var counter = 0;
      async.map(gameInfo.participants, function(participant, cb) {

        var participantData = {};
        async.parallel({
          champion: ddragon.getChampionData.bind(this, 'euw', participant.championId),
          spell1: ddragon.getSummonerSpellData.bind(this, 'euw', participant.spell1Id),
          spell2: ddragon.getSummonerSpellData.bind(this, 'euw', participant.spell2Id)
        }, function(err, ddragonRes) {
          if(err) {
            return cb(err);
          }

          participantData.team_id = participant.teamId;
          participantData.teamward_user = res.teamwardUsers[participant.summonerId] || false;

          participantData.summoner = {
            id: participant.summonerId,
            name: participant.summonerName,
            level: res.summonersData[counter] ? res.summonersData[counter].summonerLevel : 0
          };

          participantData.champion = {
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

          participantData.known_champions = res.summonersChampionData[counter] ? res.summonersChampionData[counter].rankTotal : -1,

          participantData.spell_d = {
            id: ddragonRes.spell1.id,
            name: ddragonRes.spell1.name,
            image: ddragonRes.spell1.image_url,
          };
          participantData.spell_f = {
            id: ddragonRes.spell2.id,
            name: ddragonRes.spell2.name,
            image: ddragonRes.spell2.image_url,
          };

          participantData.current_season_rank = {
            tier: res.rankedSummonerData[counter] ? res.rankedSummonerData[counter].tier : '',
            division: res.rankedSummonerData[counter] ? res.rankedSummonerData[counter].division : '',
            queue: res.rankedSummonerData[counter] ? res.rankedSummonerData[counter].queue : ''
          };

          participantData.last_season_rank = res.lastSeasonRankedSummonerData[counter];

          participantData.recent_games = res.matchHistoryData[participant.summonerId];
          counter += 1;
          cb(null, participantData);
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
