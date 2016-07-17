"use strict";
var async = require("async");
var mongoose = require("mongoose");

function initializeMatchups(player) {
  player.champion.matchup = {};
}

// Teams are an array of player
module.exports.fillMatchups = function fillMatchupData(team1, team2, cb) {
  var Champion = mongoose.model("Champion");


  team1.forEach(initializeMatchups);
  team2.forEach(initializeMatchups);

  async.each(team1, function(player, cb) {
    if(!player.champion.role || player.champion.role === '?') {
      return cb();
    }
    // do we have a matchup for the same role?
    var player2 = team2.find(function(player2) {
      return player2.champion.role === player.champion.role;
    });

    if(!player2) {
      return cb();
    }

    async.waterfall([
      function loadMatchup(cb) {
        Champion.find({_id: player.champion.id}, cb);
      },
      function writeMatchup(championData, cb) {
        var matchup = championData[0].getMatchups(player.champion.role).find(function(matchup) {
          return matchup.id.toString() === player2.champion.id.toString();
        });

        if(!matchup) {
          return cb();
        }

        player.champion.matchup = {
          winRate: matchup.winRate
        };

        player2.champion.matchup = {
          winRate: 100 - matchup.winRate
        };

        cb();
      }
    ], cb);
  }, cb);
};
