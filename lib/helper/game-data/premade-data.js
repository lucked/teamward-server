"use strict";
var premadeHelper = require('../premade');


module.exports = function premadeData(gameInfo, historyPremadeData, dbPremadeData, cb) {
  // Merge premades data from history and from DB
  var mergedData = historyPremadeData;
  Object.keys(dbPremadeData).forEach(function(key) {
    if(!mergedData[key]) {
      mergedData[key] = new Set();
    }

    dbPremadeData[key].forEach(mergedData[key].add.bind(mergedData[key]));
  });

  var premadeData = {};
  Object.keys(mergedData).forEach(function(key) {
    premadeData[key] = {
      knownPlayers: mergedData[key],
      // Retrieve team ID for summoner
      teamId: gameInfo.participants.find(function(participant) {
        return participant.summonerId === parseInt(key);
      }).teamId,
    };
  });

  var premade = premadeHelper.getPremade(premadeData);
  cb(null, premade);
};
