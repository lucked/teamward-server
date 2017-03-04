"use strict";

module.exports = function historyPremadeData(gameInfo, summonerIds, rawMatchHistoryData, pluckSummonerIds, cb) {
  // First reduce: build an object,
  // keys are summonerId,
  // value an array of people currently in the same game with whom this summoner shares a previous match in the same team
  var historyPremadeData = rawMatchHistoryData.reduce(function(acc, matchHistory) {
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
};
