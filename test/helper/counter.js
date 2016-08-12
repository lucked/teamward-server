"use strict";
var assert = require("assert");

var counterHelper = require("../../lib/helper/counter.js");

describe("Counter helper", function() {
  function buildAPIChampion(id) {
    return {
      championId: id,
      level: 5
    };
  }
  function buildMatchup(id, winRate) {
    // For test purposes, id and names are the same
    return {
      id: id,
      name: id,
      winRate: winRate || 50
    };
  }

  function buildDbChampion(id, matchups) {
    // For test purposes, id and names are the same
    return {
      _id: id,
      name: id,
      getMatchups: function() {
        return matchups || [];
      }
    };
  }

  it("should return nothing when rolesChampions and masteredChampions are empty", function(done) {
    counterHelper([], [], "TOP", function(err, results) {
      if(err) {
        return done(err);
      }

      assert.equal(results.length, 0);
      done();
    });
  });

  it("should return one line for each rolesChampion", function(done) {
    var masteredChampions = [
      buildAPIChampion("illaoi")
    ];

    var rolesChampions = [
      buildDbChampion("graves", [
        buildMatchup("illaoi", 45)
      ]),
      buildDbChampion("teemo", [
        buildMatchup("illaoi", 70)
      ]),
      buildDbChampion("illaoi"),
    ];

    counterHelper(rolesChampions, masteredChampions, "TOP", function(err, res) {
      if(err) {
        return done(err);
      }

      assert.equal(res.length, 3);
      assert.equal(res[0].champion.id, "graves");
      assert.equal(res[0].champion.name, "graves");
      assert.equal(res[0].counter.id, "illaoi");
      assert.equal(res[0].winRate, 55);
      assert.equal(res[1].champion.id, "teemo");
      assert.equal(res[1].counter.id, "illaoi");
      // Worst counter ever :p
      assert.equal(res[1].winRate, 30);
      assert.equal(res[2].champion.id, "illaoi");
      // No counter for this one, make sure it's still null
      assert.equal(res[2].counter, null);
      assert.equal(res[2].winRate, null);

      done();
    });
  });

  it("should find the best counter from the list", function(done) {
    var masteredChampions = [
      buildAPIChampion("illaoi"),
      buildAPIChampion("singed"),
    ];

    var rolesChampions = [
      buildDbChampion("graves", [
        buildMatchup("singed", 55),
        buildMatchup("illaoi", 45)
      ]),
      buildDbChampion("illaoi", [
        buildMatchup("singed")
      ]),
      buildDbChampion("singed", [
        buildMatchup("illaoi")
      ]),
    ];

    counterHelper(rolesChampions, masteredChampions, "TOP", function(err, res) {
      if(err) {
        return done(err);
      }

      assert.equal(res.length, 3);
      assert.equal(res[0].champion.id, "graves");
      assert.equal(res[0].champion.name, "graves");
      assert.equal(res[0].counter.id, "illaoi");
      assert.equal(res[0].winRate, 55);
      assert.equal(res[1].champion.id, "illaoi");
      assert.equal(res[1].counter.id, "singed");
      assert.equal(res[1].winRate, 50);
      assert.equal(res[2].champion.id, "singed");
      assert.equal(res[2].counter.id, "illaoi");
      assert.equal(res[2].winRate, 50);

      done();
    });
  });
});
