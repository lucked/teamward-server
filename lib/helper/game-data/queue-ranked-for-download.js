"use strict";
var FJQ = require('featureless-job-queue');
var config = require('../../../config');
var fjq = new FJQ({
  redisUrl: config.redisUrl,
  redisKey: 'download-games:jobs'
});

// List all the recent ranked matches, and add them for download later
module.exports = function queueRankedForDownload(rawMatchHistoryData, region, cb) {
  var rankedGames = {};

  rawMatchHistoryData.forEach(function(matchHistory) {
    if(matchHistory && matchHistory.games && matchHistory.games.length > 0) {
      matchHistory.games.forEach(function(match) {
        if(match.subType.indexOf('RANKED') !== -1) {
          rankedGames[region + match.gameId] = {
            id: match.gameId,
            region: region
          };
        }
      });
    }
  });

  fjq.create(Object.keys(rankedGames).map(k => rankedGames[k]), cb);
};
