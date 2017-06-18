"use strict";

var assert = require('assert');
var summonerData = require('../../lib/riot-api/summoner-info-v3');
var recorder = require('../mocks/recorder');


describe.only("Summoner data v3", function() {
  describe('getSummonerData() v3', function() {
    it("should return summoner data", function(done) {
      done = recorder.useNock(this, done);
      summonerData.getSummonerData('neamar', 'euw', function(err, data) {
        assert.ifError(err);

        assert.equal(data.name, 'Neamar');
        assert.equal(data.id, 70448430);
        done();
      });
    });

    it("should return null on missing summoner", function(done) {
      done = recorder.useNock(this, done);
      summonerData.getSummonerData('neamar404', 'euw', function(err, data) {
        assert.ifError(err);

        assert.equal(data, null);
        done();
      });
    });

  });

  describe.only('getCurrentRank() v3', function() {
    it("should return current rank for summoner", function(done) {
      done = recorder.useNock(this, done);
      summonerData.getCurrentRank(70448430, 'euw', function(err, data) {
        assert.ifError(err);

        assert.equal(data.RANKED_SOLO_5x5.tier, 'SILVER');
        assert.equal(data.RANKED_SOLO_5x5.rank, 'V');
        assert.equal(data.RANKED_FLEX_SR.tier, 'BRONZE');
        assert.equal(data.RANKED_FLEX_SR.rank, 'II');
        done();
      });
    });

    it("should return empty data for unranked summoners", function(done) {
      done = recorder.useNock(this, done);
      summonerData.getCurrentRank(75121889, 'na', function(err, data) {
        assert.ifError(err);

        assert.equal(Object.keys(data).length, 0);
        done();
      });
    });
  });
});
