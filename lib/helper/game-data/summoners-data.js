"use strict";

// Builds an array, with summoner data (level, name) of each participant
module.exports = function summonersData(gameInfo, rawSummonersData, cb) {
  var summonersData = gameInfo.participants.map(function(participant) {
    var summonerId = participant.summonerId;

    if(!rawSummonersData[summonerId]) {
      return null;
    }

    return rawSummonersData[summonerId];
  });


  cb(null, summonersData);
};
