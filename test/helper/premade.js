"use strict";

var async = require("async");
var assert = require('assert');
var mongoose = require("mongoose");

var premadeHelper = require('../../lib/helper/premade');
describe("Premade helper", function() {
  describe("getPremade()", function() {
    var buildFakePlayer = function(teamId, knownPlayers) {
      return {
        teamId: teamId,
        knownPlayers: new Set(knownPlayers)
      };
    };

    it("should return 1-1-1-1-1 for independant players", function() {
      var premadeData = {
        1: buildFakePlayer(100, []),
        2: buildFakePlayer(100, []),
        3: buildFakePlayer(100, []),
        4: buildFakePlayer(100, []),
        5: buildFakePlayer(100, []),
      };

      var premade = premadeHelper.getPremade(premadeData);
      assert.equal(premade['100'].length, 5);
      assert.deepEqual(premade['100'][0], ["1"]);
    });

    it("should group simple use cases", function() {
      var premadeData = {
        1: buildFakePlayer(100, [2]),
        2: buildFakePlayer(100, [1]),
        3: buildFakePlayer(100, []),
        4: buildFakePlayer(100, []),
        5: buildFakePlayer(100, []),
      };

      var premade = premadeHelper.getPremade(premadeData);
      assert.equal(premade['100'].length, 4);
      assert.deepEqual(premade['100'][0], ["1", "2"]);
    });

    it("should still work with incomplete premade data", function() {
      var premadeData = {
        // 30 is not defined in the premadeData
        1: buildFakePlayer(100, [30]),
        2: buildFakePlayer(100, []),
        3: buildFakePlayer(100, []),
        4: buildFakePlayer(100, []),
        5: buildFakePlayer(100, []),
      };

      var premade = premadeHelper.getPremade(premadeData);
      assert.equal(premade['100'].length, 5);
      assert.deepEqual(premade['100'][0], ["1", "30"]);
    });

    it("should group simple use cases of premade 5", function() {
      var premadeData = {
        1: buildFakePlayer(100, [1, 2, 3, 4, 5]),
        2: buildFakePlayer(100, [1, 2, 3, 4, 5]),
        3: buildFakePlayer(100, [1, 2, 3, 4, 5]),
        4: buildFakePlayer(100, [1, 2, 3, 4, 5]),
        5: buildFakePlayer(100, [1, 2, 3, 4, 5]),
      };

      var premade = premadeHelper.getPremade(premadeData);
      assert.equal(premade['100'].length, 1);
      assert.equal(premade['100'][0].length, 5);
    });

    it("should group more complex use cases", function() {
      var premadeData = {
        1: buildFakePlayer(100, [2]),
        2: buildFakePlayer(100, [3]),
        3: buildFakePlayer(100, [1]),
        4: buildFakePlayer(100, [5]),
        5: buildFakePlayer(100, [4]),
      };

      var premade = premadeHelper.getPremade(premadeData);
      assert.equal(premade['100'].length, 2);
      assert.deepEqual(premade['100'][0], ['1', '2', '3']);
      assert.deepEqual(premade['100'][1], ['4', '5']);
    });

    it("should group non-cyclic use cases", function() {
      var premadeData = {
        1: buildFakePlayer(100, [2]),
        2: buildFakePlayer(100, [3]),
        3: buildFakePlayer(100, []),
        4: buildFakePlayer(100, [5]),
        5: buildFakePlayer(100, [4]),
      };

      var premade = premadeHelper.getPremade(premadeData);
      assert.equal(premade['100'].length, 2);
      assert.deepEqual(premade['100'][0], ['1', '2', '3']);
      assert.deepEqual(premade['100'][1], ['4', '5']);
    });

    it("should group non-cyclic non-sorted use cases", function() {
      var premadeData = {
        1: buildFakePlayer(100, [3]),
        2: buildFakePlayer(100, []),
        3: buildFakePlayer(100, [2]),
        4: buildFakePlayer(100, [5]),
        5: buildFakePlayer(100, [4]),
      };

      var premade = premadeHelper.getPremade(premadeData);
      assert.equal(premade['100'].length, 2);
      assert.deepEqual(premade['100'][0], ['1', '3', '2']);
      assert.deepEqual(premade['100'][1], ['4', '5']);
    });

    it("should group non-cyclic non-sorted non-reeentrant use cases", function() {
      var premadeData = {
        1: buildFakePlayer(100, [2]),
        2: buildFakePlayer(100, []),
        3: buildFakePlayer(100, [1]),
        4: buildFakePlayer(100, [5]),
        5: buildFakePlayer(100, [4]),
      };

      var premade = premadeHelper.getPremade(premadeData);
      assert.equal(premade['100'].length, 2);
      assert.deepEqual(premade['100'][0], ['1', '2', '3']);
      assert.deepEqual(premade['100'][1], ['4', '5']);
    });
  });

  describe.only("loadKnownPremadesFromDB()", function() {
    var Premade = mongoose.model('Premade');

    beforeEach(function(done) {
      Premade.remove({}, done);
    });

    it("should do nothing on an empty DB", function(done) {
      premadeHelper.loadKnownPremadesFromDB([1, 2, 3], "euw", function(err, res) {
        assert.ifError(err);

        assert.deepEqual(res, {});
        done();
      });
    });

    it("should return summoner ids in an easy to use object", function(done) {
      async.waterfall([
        function createPremade(done) {
          var premade = new Premade();
          premade._id = "euw:1";
          premade.premades = [2, 3];
          premade.save(done);
        },
        function retrievePremades(premade, count, cb) {
          premadeHelper.loadKnownPremadesFromDB([1,2], "euw", cb);
        },
        function ensureCorrectness(premades, cb) {
          assert.deepEqual(premades, {1: [2, 3]});
          cb();
        }
      ], done);
    });
  });
});
