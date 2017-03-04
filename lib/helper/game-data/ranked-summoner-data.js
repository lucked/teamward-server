"use strict";

// Builds an array, with the rank of each participant
module.exports = function rankedSummonerData(gameInfo, rawRankedSummonerData, cb) {

  var rankedData = gameInfo.participants.map(function(participant) {
    var summonerId = participant.summonerId;

    if(!rawRankedSummonerData[summonerId]) {
      return null;
    }

    var rankedData = rawRankedSummonerData[summonerId][0];
    if(!rankedData || !rankedData.entries) {
      return null;
    }

    for(var i = 0; i < rankedData.entries.length; i += 1) {
      if(parseInt(rankedData.entries[i].playerOrTeamId) === summonerId) {
        return {
          tier: rankedData.tier,
          queue: rankedData.queue,
          division: rankedData.entries[i].division,
        };
      }
    }

    return null;
  });

  cb(null, rankedData);
};
