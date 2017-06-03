"use strict";
var FJQ = require('featureless-job-queue');
var config = require('../../../config');
var fjq = new FJQ({
  redisUrl: config.redisUrl,
  redisKey: 'download-games:jobs'
});

// List all the recent ranked matches, and add them for download later
module.exports = function queueRankedForDownload(rawMatchHistoryData, region, cb) {
  if(process.env.DISABLE_DOWNLOAD_GAMES) {
    return cb();
  }

  var queuedGames = {};

  rawMatchHistoryData.forEach(function(matchHistory) {
    if(matchHistory && matchHistory.games && matchHistory.games.length > 0) {
      matchHistory.games.forEach(function(match) {
        if(match.gameType === "MATCHED_GAME") {
          var game = {
            id: match.gameId,
            region: region,
            knownPlayerInformation: {
              100: {},
              200: {},
            }
          };

          // Add personal information in it
          game.knownPlayerInformation[match.teamId][match.championId] = matchHistory.summonerId;
          match.fellowPlayers.forEach(function(p) {
            game.knownPlayerInformation[p.teamId][p.championId] = p.summonerId;
          });

          queuedGames[region + match.gameId] = game;
        }
      });
    }
  });

  fjq.create(Object.keys(queuedGames).map(k => queuedGames[k]), cb);
};
