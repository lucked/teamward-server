'use strict';

var opbeat = require('opbeat');
var async = require("async");
var rarity = require("rarity");
var newrelic = require("newrelic");

var log = require('debug')('teamward:handler:game-data');

var gameData = require('../../helper/game-data.js');
var summonerInfo = require('../../riot-api/summoner-info');
var gameInfo = require('../../riot-api/game-info');
var roleHelper = require('../../helper/roles');
var matchupsHelper = require('../../helper/matchups');


module.exports.get = function(req, res) {
  var start = new Date();
  var summonerName = req.query.summoner;
  var summonerRegion = req.query.region;

  async.waterfall([
    function getSummonerId(cb) {
      summonerInfo.getSummonerData(summonerName, summonerRegion, function(err, summonerData) {
        if((err && err.statusCode === 404) || (!err && (!summonerData || !summonerData.id))) {
          log("Summoner does not exist.");
          err = new Error("Summoner does not exist!");
          err.noLog = true;
          err.statusCode = 404;
        }

        cb(err, summonerData);
      });
    },
    function getGameData(summonerData, cb) {
      var error;

      if(!summonerData) {
        error = new Error("Issues with the Riot API :( [MISS_SUMM_DATA]");
        error.riotInternal = true;
        log(error.toString());
        return cb(error);
      }

      log("Got summoner id: " + summonerData.id);

      cb(null, summonerData.id);
    },
    function loadCurrentGame(summonerId, cb) {
      gameInfo.getCurrentGame(summonerId, summonerRegion, function(err, gameInfo) {
        var error;

        if(err && err.statusCode === 404) {
          log("Not in a game right now.");

          error = new Error("Summoner not in game.");
          error.statusCode = 404;
          error.noLog = true;
          return cb(error);
        }

        if(!gameInfo || !gameInfo.gameId) {
          error = new Error("Issues with the Riot API :( [CURR_GAME]");
          error.riotInternal = true;
          return cb(error);
        }

        log("In game #" + gameInfo.gameId + " (" + gameInfo.gameMode + " / " + gameInfo.gameType + ")");

        if(req.query.nocache) {
          log("Disabling hard cache on behalf of user.");
          gameInfo._noCache = true;
        }

        gameData.buildExternalGameData(gameInfo, summonerRegion, rarity.carry([summonerId], cb));
      });
    },
    function markOwnTeam(summonerId, gameData, cb) {
      gameData.teams.forEach(function(team) {
        team.own_team = team.players.some(function(teamMember) {
          return teamMember.summoner.id === summonerId;
        });
      });

      cb(null, gameData);
    },
    function inferRoles(gameData, cb) {
      async.each(gameData.teams, function(team, cb) {
        roleHelper.guessRoles(team.players, cb);
      }, function(err) {
        if(err) {
          log("Unable to get roles: " + err.toString());
          // Keep going anyway
          err = null;
        }
        cb(err, gameData);
      });
    },
    function addMatchup(gameData, cb) {
      // Keep in mind that for custom games, sometimes we only have one team
      matchupsHelper.fillMatchups(gameData.teams[0].players, gameData.teams[1] ? gameData.teams[1].players : [], rarity.carry([gameData], cb));
    },
    function sendData(gameData, cb) {
      var delta = new Date() - start;
      log("Fetched game information for " + req.query.summoner + " in " + delta + "ms");
      res.send(gameData);

      cb(null);
    },
  ], function(err) {
    if(err) {
      if(err.toString().indexOf("expected 200 \"OK\"") !== -1) {
        // "Expected 200 OK, got 503 ..."
        err.riotInternal = true;
      }

      if(!err.noLog && process.env.NODE_ENV !== 'test') {
        log(err);
        opbeat.captureError(err, {
          request: req,
          user: {
            id: summonerName,
            username: summonerName,
            region: summonerRegion
          }
        });
        newrelic.noticeError(err);
      }
      else {
        // Just print the short version
        log(err.toString());
      }

      // Improve explanation for errors coming from Riot
      // We've still logged the initial error in NR and Opbeat
      if(err.riotInternal) {
        err = new Error("The Riot API seems to be down, please retry later :(");
        err.statusCode = 502;
      }

      res.status(err.statusCode || 500).send(err.toString());

      return;
    }
  });
};
