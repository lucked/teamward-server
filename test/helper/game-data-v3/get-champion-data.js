"use strict";

var assert = require("assert");

var getChampionData = require('../../../lib/helper/game-data-v3/get-champion-data.js');

describe("getChampionData()", function() {
  it("should return all champion data", function(done) {
    getChampionData([{summonerId: 70448430, championId: 420}], 'euw', function(err, data) {
      assert.ifError(err);
      assert.equal(data[70448430].id, 420);
      assert.equal(data[70448430].name, "Illaoi");
      assert.ok(data[70448430].image);
      assert.ok(data[70448430].splash);
      assert.equal(data[70448430].gg, "http://champion.gg/Illaoi");
      assert.ok(data[70448430].ad);
      assert.ok(data[70448430].ap);
      assert.equal(data[70448430].mastery, 7);
      assert.ok(data[70448430].points > 100000);
      assert.equal(data[70448430].champion_rank, 1);

      done();
    });
  });
});
