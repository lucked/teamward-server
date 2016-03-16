"use strict";

var nock = require('nock');
var assert = require('assert');
var summonerData = require('../../lib/riot-api/summoner-info');


describe("Summoner data", function() {

  describe('getSummonerData()', function() {
    before(function() {
      nock('https://euw.api.pvp.net')
        .get('/api/lol/euw/v2.2/summoner/by-name/neamar')
        .query(true)
        .reply(200, require('../mocks/summoner-by-name.json'));
    });

    it("should return summoner data", function(done) {
      summonerData.getSummonerData('neamar', 'euw', function(err, data) {
        if(err) {
          return done(err);
        }

        assert.equal(data.summonerName, 'neamar');
        assert.equal(data.accountId, 219773652);
        done();
      });
    });
  });

  describe('getChampions()', function() {
    before(function() {
      nock('https://euw.api.pvp.net')
        .get('/championmastery/location/EUW1/player/70448430/champions')
        .query(true)
        .reply(200, require('../mocks/summoner-champions.json'));
    });

    it("should return top champions for summoner", function(done) {
      summonerData.getChampions(70448430, 'euw', function(err, data) {
        if(err) {
          return done(err);
        }

        assert.ok(data.length);
        assert.equal(data[0].championId, 420);
        done();
      });
    });
  });

  describe('getCurrentRank()', function() {
    before(function() {
      nock('https://euw.api.pvp.net')
        .get('/api/lol/euw/v2.5/league/by-summoner/19083089,19917877/entry')
        .query(true)
        .reply(200, require('../mocks/league-entry.json'));

    });

    it("should return current rank for summoner", function(done) {
      summonerData.getCurrentRank([19083089, 19917877], 'euw', function(err, data) {
        if(err) {
          return done(err);
        }

        assert.ok(data[19083089]);
        assert.ok(data[19917877]);
        assert.equal(data[19083089][0].tier, 'GOLD');
        assert.equal(data[19083089][0].entries[0].division, 'I');
        assert.equal(data[19083089][0].tier, 'GOLD');
        done();
      });
    });
  });
});
