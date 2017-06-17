"use strict";

var assert = require("assert");
var async = require("async");
var rarity = require("rarity");
var mongoose = require("mongoose");

var setup = require('../../setup.js');
var getPremades = require('../../../lib/helper/game-data-v3/get-premades.js');

describe("getPremades()", function() {
  var Premade = mongoose.model("Premade");
  beforeEach(function(done) {
    Premade.remove({}, done);
  });
  beforeEach(setup.truncateDatabase);

  // Mongo knows that 1 plays with 2
  var insertFakeMongoPremade = function(cb) {
    var premade = new Premade();
    premade._id = "euw:1";
    premade.premades = [2];
    premade.save(rarity.slice(1, cb));
  };

  // Postgres knows that 1 plays with 3
  var insertFakePostgresPremade = function(cb) {
    async.waterfall([
      function insertFakeMatch(cb) {
        setup.dbPool.query("INSERT INTO matches(id, region, winner, queue, map, season, patch, creation, duration, rank) VALUES(1, 'euw', 100, 'RANKED_SOLO', 11, 7, 12, '2017-06-17 16:59:05', 123, 'UNRANKED')", rarity.slice(1, cb));
      },
      function insertFakePremade(cb) {
        setup.dbPool.query("INSERT INTO matches_participants(match_id, region, team_id, summoner_id, role, champion_id, kills, deaths, assists, cs, first_blood, first_tower, first_inhibitor, largest_kill, largest_spree, tower_kills, inhibitor_kills, gold_earned, last_season, spell_d, spell_f, item_0, item_1, item_2, item_3, item_4, item_5, item_6, gold_0_10, gold_10_20, xp_0_10, xp_10_20, double_kills, triple_kills, quadra_kills, penta_kills) VALUES" +
          "(1, 'euw', 100, 1, 'TOP', 420, 0, 0, 0, 0, false, false, false, 0, 0, 0, 0, 0, 'UNRANKED', 4, 12, 0, 1, 2, 3, 4, 5, 6, 0, 10, 0, 10, 0, 0, 0, 0)," +
          "(1, 'euw', 100, 3, 'TOP', 420, 0, 0, 0, 0, false, false, false, 0, 0, 0, 0, 0, 'UNRANKED', 4, 12, 0, 1, 2, 3, 4, 5, 6, 0, 10, 0, 10, 0, 0, 0, 0)", rarity.slice(1, cb));
      }
    ], cb);
  };

  it("should return premades from Mongo database", function(done) {
    async.waterfall([
      function insertFakePremade(cb) {
        insertFakeMongoPremade(cb);
      },
      function compute(cb) {
        getPremades([
          {summonerId: 1, teamId: 100},
          {summonerId: 2, teamId: 100},
          {summonerId: 3, teamId: 100},
        ], 'euw', cb);
      },
      function validateValues(res, cb) {
        assert.deepEqual(res[100], [[1, 2], [3]]);
        cb();
      }
    ], done);
  });

  it("should return premades from Postgres database", function(done) {
    async.waterfall([
      function insertFakePremade(cb) {
        insertFakePostgresPremade(cb);
      },
      function compute(cb) {
        getPremades([
          {summonerId: 1, teamId: 100},
          {summonerId: 2, teamId: 100},
          {summonerId: 3, teamId: 100},
        ], 'euw', cb);
      },
      function validateValues(res, cb) {
        assert.deepEqual(res[100], [[1, 3], [2]]);
        cb();
      }
    ], done);
  });

  it("should return premades from both databases", function(done) {
    async.waterfall([
      function mongo(cb) {
        insertFakeMongoPremade(cb);
      },
      function postgres(cb) {
        insertFakePostgresPremade(cb);
      },
      function compute(cb) {
        getPremades([
          {summonerId: 1, teamId: 100},
          {summonerId: 2, teamId: 100},
          {summonerId: 3, teamId: 100},
        ], 'euw', cb);
      },
      function validateValues(res, cb) {
        assert.deepEqual(res[100], [[1, 3, 2]]);
        cb();
      }
    ], done);
  });
});
