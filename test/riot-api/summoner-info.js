"use strict";

var assert = require('assert');
var summonerData = require('../../lib/riot-api/summoner-info');
var recorder = require('../mocks/recorder');


describe("Summoner data", function() {
  describe('getSummonerData()', function() {
    it("should return summoner data", function(done) {
      done = recorder.useNock(this, done);
      summonerData.getSummonerData('neamar', 'euw', function(err, data) {
        assert.ifError(err);

        assert.equal(data.name, 'Neamar');
        assert.equal(data.id, 86002026);
        done();
      });
    });
  });

  describe('getSummonersData()', function() {
    it("should return summoner data", function(done) {
      done = recorder.useNock(this, done);

      summonerData.getSummonersData([70448430, 19083089, 19917877, 57780340, 53870009, 19917878, 27321542, 78179191, 38621938, 79947339], 'euw', function(err, data) {
        assert.ifError(err);

        assert.equal(Object.keys(data).length, 10);
        assert.equal(data[19083089].name, "N4dlPb");
        done();
      });
    });
  });

  describe('getChampions()', function() {
    it("should return top champions for summoner", function(done) {
      done = recorder.useNock(this, done);

      summonerData.getChampions(70448430, 'euw', function(err, data) {
        assert.ifError(err);

        assert.ok(data.length);
        assert.equal(data[0].championId, 420);
        done();
      });
    });
  });

  describe('getCurrentRanks()', function() {
    it("should return current rank for summoners", function(done) {
      done = recorder.useNock(this, done);
      summonerData.getCurrentRanks([19083089, 19917877], 'euw', function(err, data) {
        assert.ifError(err);

        assert.ok(data[19083089]);
        assert.ok(data[19917877]);
        assert.equal(data[19083089][0].tier, 'PLATINUM');
        assert.equal(data[19083089][0].entries[0].division, 'IV');
        assert.equal(data[19083089][0].tier, 'PLATINUM');
        done();
      });
    });

    it("should return empty data for unranked summoners", function(done) {
      done = recorder.useNock(this, done);
      summonerData.getCurrentRanks([44490420], 'euw', function(err, data) {
        assert.ifError(err);

        assert.equal(Object.keys(data).length, 0);
        done();
      });
    });
  });
});
