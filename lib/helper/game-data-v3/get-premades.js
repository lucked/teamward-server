"use strict";
var async = require("async");
var mongoose = require("mongoose");

var premadeHelper = require('../premade');

module.exports = function getPremades(participants, region, cb) {
  var Premade = mongoose.model("Premade");

  var summonerIds = participants.map(p => p.summonerId);

  async.auto({
    historyPremadeData: function(cb) {
      // TODO
      var historyPremadeData = {};
      summonerIds.forEach(function(summonerId) {
        historyPremadeData[summonerId] = new Set();
      });

      cb(null, historyPremadeData);
    },
    dbPremadeData: function dbPremadeData(cb) {
      Premade.loadKnownPremadesFromDB(summonerIds, region, cb);
    },
    premadeData: ['historyPremadeData', 'dbPremadeData', function(res, cb) {
      // Merge premades data from history and from DB
      var mergedData = res.historyPremadeData;
      Object.keys(res.dbPremadeData).forEach(function(key) {
        res.dbPremadeData[key].forEach(mergedData[key].add.bind(mergedData[key]));
      });

      var premadeData = {};
      Object.keys(mergedData).forEach(function(key) {
        premadeData[key] = {
          knownPlayers: mergedData[key],
          // Retrieve team ID for summoner
          teamId: participants.find(p => p.summonerId === parseInt(key)).teamId,
        };
      });

      var premade = premadeHelper.getPremade(premadeData);
      cb(null, premade);
    }],
    savePremadeDataToDb: ['premadeData', function savePremadeDataToDb(res, cb) {
      Premade.savePremadesToDB(res.premadeData, region, cb);
    }],
  }, function combine(err, res) {
    if(err) {
      return cb(err);
    }

    cb(null, res.premadeData);
  });
};
