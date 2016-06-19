"use strict";
var async = require("async");
var mongoose = require("mongoose");

var log = require('debug')('teamward:worker:game-crawler');

var Game = mongoose.model("Game");
var gameInfo = require('../riot-api/game-info.js');
var gameData = require('../helper/game-data.js');

function downloadGameData(gameId, region, cb) {
  async.waterfall([
    function getRiotGameData(cb) {
      gameInfo.getExistingGame(gameId, region, cb);
    },
    function rewireParticipants(gameInfo, cb) {
      // Make match info compatible with spectator info
      gameInfo.participants.forEach(function(participant) {
        participant.summonerId = gameInfo.participantIdentities[participant.participantId - 1].summonerId;
      });

      cb(null, gameInfo);
    },
    function getGameData(gameInfo, cb) {
      gameData.buildExternalGameData(gameInfo, region, cb);
    }
  ], cb);
}

module.exports = function startWorker(opbeat) {
  async.waterfall([
    function getHighestGameId(cb) {
      Game.find({}).sort({_id: -1}).limit(1).exec(cb);
    },
    function fetchGames(games, cb) {
      if(games.length === 0) {
        log("No game in memory yet.");
        return;
      }
      var game = games[0];

      // Assuming 10 new games / seconds,
      // and a max game length of one hour,
      // Try to get games that are already ended
      var highestGameId = game.gameId - 10 * 3600;
      var targetGameId = highestGameId - 20;
      var region = game.region;

      var gameIds = [];
      for(var i = targetGameId; i < highestGameId; i += 1) {
        gameIds.push(i);
      }

      async.eachLimit(gameIds, 1, function(gameId, cb) {
        async.waterfall([
          function checkAlreadyExists(cb) {
            Game.find({gameId: gameId, region: region}, cb);
          },
          function getGameData(existingGame, cb) {
            if(existingGame.length !== 0) {
              log("Game already in memory: #" + gameId);
              return cb(null, null);
            }

            log("Downloading data for game #" + gameId);
            downloadGameData(gameId, region, cb);
          },
          function saveData(gameData, cb) {
            if(!gameData) {
              return cb();
            }

            log("Inserting new sample game: #" + gameId);
            var game = new Game();
            game.gameId = gameId;
            game.region = region;
            game.data = gameData;
            game.save(cb);
          }], function(err) {
            if(err) {
              log(err);
            }

            cb();
          });
      }, cb);
    },
  ], function(err) {
    if(err) {
      console.log(err);
    }

    log("Finished crawling games.");
  });
};
