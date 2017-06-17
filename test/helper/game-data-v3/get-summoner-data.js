"use strict";

var assert = require("assert");

var setup = require('../../setup.js');
var recorder = require('../../mocks/recorder.js');
var getSummonerData = require('../../../lib/helper/game-data-v3/get-summoner-data.js');

describe("getSummonerData()", function() {
  before(setup.truncateDatabase);
  before(function(done) {
    setup.dbPool.query("INSERT INTO matches(id, region, winner, queue, map, season, patch, creation, duration, rank) VALUES(1, 'euw', 100, 'RANKED_SOLO', 11, 7, 12, '2017-06-17 16:59:05', 123, 'UNRANKED')", done);
  });
  before(function(done) {
    setup.dbPool.query("INSERT INTO matches_participants(match_id, region, team_id, summoner_id, role, champion_id, kills, deaths, assists, cs, first_blood, first_tower, first_inhibitor, largest_kill, largest_spree, tower_kills, inhibitor_kills, gold_earned, last_season, spell_d, spell_f, item_0, item_1, item_2, item_3, item_4, item_5, item_6, gold_0_10, gold_10_20, xp_0_10, xp_10_20, double_kills, triple_kills, quadra_kills, penta_kills) VALUES(1, 'euw', 100, 70448430, 'TOP', 420, 0, 0, 0, 0, false, false, false, 0, 0, 0, 0, 0, 'UNRANKED', 4, 12, 0, 1, 2, 3, 4, 5, 6, 0, 10, 0, 10, 0, 0, 0, 0)", done);
  });

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
      assert.equal(data[70448430].last_season_rank, "UNRANKED");

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
