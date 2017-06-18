'use strict';
var async = require("async");
var log = require("debug")("teamward:game-data");

var getChampionData = require('./get-champion-data');
var getSummonerData = require('./get-summoner-data');
var getSpellData = require('./get-spell-data');
var getTeamwardUsers = require('./get-teamward-users.js');
var getPremades = require('./get-premades.js');

module.exports.buildExternalGameData = function buildExternalGameData(gameInfo, region, cb) {
  log("Retrieving game data for game #" + gameInfo.gameId + " (" + region + ")");


  // Each function should follow the same convention for its cb: err, {summId: value, summId2: ...}
  async.auto({
    championData: function(cb) {
      var summonerIdAndChampionInformation = gameInfo.participants.map(p => {
        return {
          summonerId: p.summonerId,
          championId: p.championId
        };
      });
      getChampionData(summonerIdAndChampionInformation, region,cb);
    },
    summonerData: function(cb) {
      getSummonerData(gameInfo.participants, region, cb);
    },
    teamward: function(cb) {
      getTeamwardUsers(gameInfo.participants.map(p => p.summonerId), region, cb);
    },
    spells: function(cb) {
      getSpellData(gameInfo.participants, region, cb);
    },
    premades: function(cb) {
      getPremades(gameInfo.participants, region, cb);
    },
  }, function combine(err, res) {
    if(err) {
      return cb(err);
    }

    var teams = [100, 200].map(function(teamId) {
      return {
        team_id: teamId,
        premades: res.premades[teamId],
        players: gameInfo.participants.filter(p => p.teamId === teamId).map(function(p) {
          var id = p.summonerId;
          var player = {
            teamward_user: res.teamward[id],
            summoner: {
              id: id,
              name: p.summonerName,
              level: res.summonerData[id].level,
            },
            spell_d: res.spells[id].spellD,
            spell_f: res.spells[id].spellF,
            champion: res.championData[id],
            current_season_rank: {
              tier: res.summonerData[id].tier,
              division: res.summonerData[id].division,
              queue: res.summonerData[id].queue,
            },
            last_season_rank: res.summonerData[id].last_season_rank,
            // TODO: remove fields below. (app v2.12)
            known_champions: 100,
            recent_games: {
              total: 10,
              wins: 5,
              losses: 5,
              average_time_between_games: 17000
            }
          };

          return player;
        })
      };
    });

    var finalResult = {
      game_id: gameInfo.gameId,
      map_id: gameInfo.mapId,
      game_start_time: gameInfo.gameStartTime ? gameInfo.gameStartTime : new Date().getTime(), // Game start time is empty during the first three minutes
      game_mode: gameInfo.gameMode,
      game_type: gameInfo.gameType,
      teams: teams
    };

    cb(null, finalResult);
  });
};
