"use strict";

var async = require("async");

var gameInfoApi = require('../../riot-api/game-info');


module.exports = function(gameInfo, rawMatchHistoryData, rankedSummonerData, region, log, cb) {
  var currentRankedData = rankedSummonerData;
  var index = -1;
  async.map(gameInfo.participants, function(participant, cb) {
    index += 1;
    if(currentRankedData[index] !== null) {
      // Already playing ranked this season, no need to fetch last season information
      return cb(null, null);
    }

    // Otherwise, find a game
    var matchHistory = rawMatchHistoryData[index];
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
};
