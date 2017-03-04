"use strict";


// Builds an array of champion mastery for each champion in game
module.exports = function summonersChampionData(gameInfo, rawSummonersChampionData, cb) {
  // First reduce: build an object,
  // keys are summonerId,
  // value an array of all champs
  var championData = rawSummonersChampionData.reduce(function(acc, championsList) {
    if(championsList && championsList.length > 0) {
      acc[championsList[0].playerId] = championsList;
    }
    return acc;
  }, {});

  // Then build an array for each participant
  // with the relevant champion mastery
  var currentChampionData = gameInfo.participants.map(function(participant) {
    var summonerId = participant.summonerId;
    if(!championData[summonerId]) {
      return null;
    }

    for(var i = 0; i < championData[summonerId].length; i += 1) {
      if(championData[summonerId][i].championId === participant.championId) {
        // Is it his main champ?
        // Add one to get it 1-indexed.
        championData[summonerId][i].rank = i + 1;
        championData[summonerId][i].rankTotal = championData[summonerId].length;
        return championData[summonerId][i];
      }
    }

    return null;
  });

  cb(null, currentChampionData);
};
