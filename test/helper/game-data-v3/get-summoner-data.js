"use strict";

var assert = require("assert");

var recorder = require('../../mocks/recorder.js');
var getSummonerData = require('../../../lib/helper/game-data-v3/get-summoner-data.js');

describe("getSummonerData()", function() {
  it("should return summoner ranked information when player is ranked", function(done) {
    done = recorder.useNock(this, done);
    var fakeParticipants = [require('../../mocks/mocks/custom_get-spectator-game-info.json').participants[0]];

    getSummonerData(fakeParticipants, 'euw', function(err, data) {
      assert.ifError(err);
      assert.equal(data[70448430].id, 70448430);
      assert.equal(data[70448430].name, "Neamar");
      assert.equal(data[70448430].level, 30);
      assert.equal(data[70448430].tier, "SILVER");
      assert.equal(data[70448430].division, 'V');
      assert.equal(data[70448430].queue, "RANKED_SOLO_5x5");
      // TODO
      assert.equal(data[70448430].last_season_rank, null);

      done();
    });
  });

  it("should return summoner level information when player is unranked", function(done) {
    done = recorder.useNock(this, done);
    var fakeParticipants = [{
      summonerId: 75121889,
      summonerName: 'NeamarNA',
      runes: [],
      masteries: [],
    }];

    getSummonerData(fakeParticipants, 'na', function(err, data) {
      assert.ifError(err);
      assert.equal(data[75121889].id, 75121889);
      assert.equal(data[75121889].name, "NeamarNA");
      assert.equal(data[75121889].level, 26);
      assert.equal(data[75121889].tier, '');
      assert.equal(data[75121889].division, '');
      assert.equal(data[75121889].queue, '');
      // TODO
      assert.equal(data[75121889].last_season_rank, null);

      done();
    });
  });
});
