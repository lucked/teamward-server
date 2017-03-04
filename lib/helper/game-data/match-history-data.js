"use strict";

// Builds an object,
// key are summonerIds,
// values knows games for this summoner
module.exports = function matchHistoryData(rawMatchHistoryData, cb) {
  // First reduce: build an object,
  // keys are summonerId,
  // value an array of games
  var matchData = rawMatchHistoryData.reduce(function(acc, matchHistory) {
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
};
