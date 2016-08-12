"use strict";
var assert = require("assert");

var counterHelper = require("../../lib/helper/counter.js");

describe.only("Counter helper", function() {
  function buildAPIChampion(id) {
    return {
      championId: id,
      level: 5
    };
  }
  function buildMatchup(id, winRate) {
    return {
      id: id,
      winRate: winRate || 50
    };
  }

  function buildDbChampion(id, matchups) {
    // For test purposes, id and names are the same
    return {
      _id: id,
      name: id,
      getMatchups: function() {
        return matchups;
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


  it("should return the best matchup from the list", function(done) {
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

      assert.equal(res.length, 1);
      assert.equal(res[0].champion.id, "graves");
      assert.equal(res[0].champion.name, "graves");
      assert.equal(res[0].counter.id, "illaoi");
      assert.equal(res[0].winRate, 55);

    });
  });
});
