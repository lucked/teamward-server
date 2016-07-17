"use strict";

var mongoose = require("mongoose");
var assert = require('assert');
var async = require("async");
var matchupsHelper = require('../../lib/helper/matchups');

describe("Matchups helper", function() {
  var Champion = mongoose.model('Champion');
  describe("fillMatchups()", function() {
    var buildFakePlayer = function(champion) {
      return {
        champion: {
          id: champion.id,
          name: champion.name,
          role: champion.roles[0]
        }
      };
    };

    var buildFakeChampion = function(name, roles) {
      buildFakeChampion.id = buildFakeChampion.id || 0;

      var champion = new Champion();
      champion._id = buildFakeChampion.id;
      champion.name = name;
      champion.roles = roles;

      buildFakeChampion.id += 1;

      return champion;
    };

    var champions = [
      buildFakeChampion('Illaoi', ['TOP']),
      buildFakeChampion('Xerath', ['MID']),
      buildFakeChampion('Lulu', ['SUPPORT']),
      buildFakeChampion('Sejuani', ['JUNGLE']),
      buildFakeChampion('Ashe', ['BOT']),
      buildFakeChampion('Singed', ['TOP']),
      buildFakeChampion('Le blanc', ['MID']),
      buildFakeChampion('Alistar', ['SUPPORT']),
      buildFakeChampion('Vi', ['JUNGLE']),
      buildFakeChampion('Lucian', ['BOT']),
    ];

    before(function(done) {
      Champion.remove({}, done);
    });

    before(function(done) {
      // Fill matchups information:
      champions.forEach(function(champion) {
        // Find other champion with same role
        var against = champions.find(function(champion2) {
          return champion2 !== champion && champion2.roles[0] === champion.roles[0];
        });

        if(!against) {
          throw new Error("Invalid stub data");
        }

        var key = champion.roles[0].toLowerCase() + "Matchups";

        champion[key] = [
          {
            winRate: Math.round(Math.random() * 1000) / 10,
            name: against.name,
            id: against._id
          }
        ];

      });

      async.each(champions, function(champion, cb) {
        champion.save(cb);
      }, done);
    });

    it("should skip unknown matchups", function(done) {
      // TOP champions only
      var team1 = [
        buildFakePlayer(champions[0]),
        buildFakePlayer(champions[0]),
        buildFakePlayer(champions[0]),
        buildFakePlayer(champions[0]),
        buildFakePlayer(champions[0]),
      ];

      // MID champions only
      var team2 = [
        buildFakePlayer(champions[1]),
        buildFakePlayer(champions[1]),
        buildFakePlayer(champions[1]),
        buildFakePlayer(champions[1]),
        buildFakePlayer(champions[1]),
      ];

      async.waterfall([
        function fillMatchups(cb) {
          matchupsHelper.fillMatchups(team1, team2, cb);
        },
        function(cb) {
          assert.equal(team1[0].champion.matchup.winRate, undefined);
          assert.equal(team2[0].champion.matchup.winRate, undefined);
          cb();
        }
      ], done);
    });

    it("should append matchups data to the team object", function(done) {
      var team1 = [
        buildFakePlayer(champions[0]),
        buildFakePlayer(champions[1]),
        buildFakePlayer(champions[2]),
        buildFakePlayer(champions[3]),
        buildFakePlayer(champions[4]),
      ];

      var team2 = [
        buildFakePlayer(champions[5]),
        buildFakePlayer(champions[6]),
        buildFakePlayer(champions[7]),
        buildFakePlayer(champions[8]),
        buildFakePlayer(champions[9]),
      ];

      async.waterfall([
        function fillMatchups(cb) {
          matchupsHelper.fillMatchups(team1, team2, cb);
        },
        function(cb) {
          var championData = champions[0];
          var expectedWinRate = championData[championData.roles[0].toLowerCase() + "Matchups"][0].winRate;

          assert.equal(team1[0].champion.matchup.winRate, expectedWinRate);

          assert.equal(team2[0].champion.matchup.winRate, 100 - expectedWinRate);
          cb();
        }
      ], done);
    });
  });
});
