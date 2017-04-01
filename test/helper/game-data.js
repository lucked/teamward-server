"use strict";

var nock = require("nock");
var mongoose = require("mongoose");
var async = require("async");

var recorder = require('../mocks/recorder.js');
var assert = require('assert');
var gameData = require('../../lib/helper/game-data');


describe("Game data", function() {
  var Premade = mongoose.model('Premade');

  beforeEach(function(done) {
    Premade.remove({}, done);
  });

  it("should return current game data", function(done) {
    this.timeout(40000);
    done = recorder.useNock(this, done);
    var fakeGameData = require('../mocks/mocks/custom_get-spectator-game-info.json');

    gameData.buildExternalGameData(fakeGameData, 'euw', function(err, data) {
      assert.ifError(err);

      assert.equal(data.map_id, 11);
      assert.equal(data.teams.length, 2);
      assert.equal(data.teams[0].team_id, 100);
      assert.equal(data.teams[0].players[0].champion.name, 'Illaoi');
      assert.equal(data.teams[0].players[0].champion.ad, 8);
      assert.equal(data.teams[0].players[0].champion.ap, 3);
      assert.equal(data.teams[0].players[0].summoner.name, 'Neamar');
      assert.equal(data.teams[0].players[0].summoner.level, 30);
      assert.equal(data.teams[0].players[0].spell_d.name, 'Flash');
      assert.equal(data.teams[0].players[0].spell_d.id, 'SummonerFlash');
      assert.equal(data.teams[0].players[1].current_season_rank.tier, 'GOLD');
      assert.equal(data.teams[0].players[2].last_season_rank, 'GOLD');

      done();
    });
  });

  it("should cache game data results", function(done) {
    // This test ensure that calling buildExternalGameData() more than once won't trigger any more HTTP calls to the API
    this.timeout(40000);
    done = recorder.useNock(this, done);
    var fakeGameData = require('../mocks/mocks/custom_get-spectator-game-info.json');
    gameData.buildExternalGameData(fakeGameData, 'euw', function(err, data) {
      assert.ifError(err);

      assert.equal(data.map_id, 11);

      // Remove all nocks
      nock.cleanAll();

      gameData.buildExternalGameData(fakeGameData, 'euw', function(err, data) {
        assert.ifError(err);

        assert.equal(data.map_id, 11);

        done();
      });

    });
  });

  it("should guess premades data", function(done) {
    this.timeout(40000);
    done = recorder.useNock(this, done);

    var fakeGameData = require('../mocks/mocks/custom_get-spectator-game-info-premade.json');
    gameData.buildExternalGameData(fakeGameData, 'euw', function(err, data) {
      assert.ifError(err);

      assert.equal(data.map_id, 11);
      assert.equal(data.teams.length, 2);
      assert.equal(data.teams[0].team_id, 100);
      assert.equal(data.teams[0].premades.length, 5);
      assert.equal(data.teams[1].premades.length, 4);
      assert.equal(data.teams[1].premades[0].length, 2);

      done();
    });
  });

  it("should save premades data", function(done) {
    this.timeout(40000);
    done = recorder.useNock(this, done);

    var fakeGameData = require('../mocks/mocks/custom_get-spectator-game-info-premade.json');

    async.waterfall([
      function build(cb) {
        gameData.buildExternalGameData(fakeGameData, 'euw', cb);
      },
      function getPremades(data, cb) {
        mongoose.model('Premade').find({}, cb);
      },
      function checkPremades(premades, cb) {
        assert.ok(premades.length > 0);
        assert.ok(premades[0].premades.length > 0);

        cb();
      },
    ], done);
  });
});
