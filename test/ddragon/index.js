'use strict';

var nock = require('nock');
var async = require("async");
var assert = require('assert');
var ddragonInfo = require('../../lib/ddragon');
var recorder = require('../mocks/recorder.js');


describe("Ddragon info", function() {
  describe("Champion info", function() {
    it("should return champion information", function(done) {
      done = recorder.useNock(this, done);
      ddragonInfo.getChampionData('euw', 420, function(err, data) {
        assert.ifError(err);

        assert.equal(data.id, 'Illaoi');
        done();
      });
    });

    it("should cache champion information", function(done) {
      done = recorder.useNock(this, done);
      async.series([
        function firstCall(cb) {
          ddragonInfo.getChampionData('euw', 420, function(err, data) {
            assert.ifError(err);

            assert.equal(data.id, 'Illaoi');
            cb();
          });
        },
        function secondCall(cb) {
          nock('https://ddragon.leagueoflegends.com')
            .get('/realms/euw.json')
            .reply(404)
            .get('/cdn/6.5.1/data/en_US/champion.json')
            .reply(404);

          ddragonInfo.getChampionData('euw', 420, function(err, data) {
            assert.ifError(err);

            assert.equal(data.id, 'Illaoi');

            cb();
          });
        }
      ], done);
    });

    it("should return champion information from champion name too", function(done) {
      done = recorder.useNock(this, done);

      ddragonInfo.getChampionData('euw', 'Illaoi', function(err, data) {
        assert.ifError(err);

        assert.equal(data.id, 'Illaoi');
        assert.equal(data.key, 420);
        done();
      });
    });
  });

  describe("Summoner spell info", function() {

    it("should return summoner spelll information", function(done) {
      done = recorder.useNock(this, done);
      ddragonInfo.getSummonerSpellData('euw', 4, function(err, data) {
        assert.ifError(err);

        assert.equal(data.id, 'SummonerFlash');

        done();
      });
    });
  });

  describe("Detailed Champion info", function() {
    it("should return detailed champion information", function(done) {
      done = recorder.useNock(this, done);
      ddragonInfo.getDetailedChampionData('euw', 420, function(err, data) {
        assert.ifError(err);

        assert.equal(data.id, 'Illaoi');
        assert.equal(data.spells[0].id, 'IllaoiQ');
        assert.ok(data.enemytips.length > 0);
        done();
      });
    });
  });
});
