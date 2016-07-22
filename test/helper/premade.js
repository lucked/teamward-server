"use strict";

var assert = require('assert');
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
});
