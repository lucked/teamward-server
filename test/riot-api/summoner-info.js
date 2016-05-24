"use strict";

var nock = require('nock');
var assert = require('assert');
var summonerData = require('../../lib/riot-api/summoner-info');


describe("Summoner data", function() {
  describe('getSummonerData()', function() {
    it("should return summoner data", function(done) {
      nock('https://euw.api.pvp.net')
        .get('/api/lol/euw/v1.4/summoner/by-name/neamar')
        .query(true)
        .reply(200, require('../mocks/summoner-by-name.json'));

      summonerData.getSummonerData('neamar', 'euw', function(err, data) {
        if(err) {
          return done(err);
        }

        assert.equal(data.name, 'neamar');
        assert.equal(data.id, 70448430);
        done();
      });
    });

    it("should fail when API is down", function(done) {
      nock('https://euw.api.pvp.net')
        .get('/api/lol/euw/v1.4/summoner/by-name/neamarDoesNotExists')
        .query(true)
        .reply(500, require('../mocks/summoner-by-name-500.json'));

      summonerData.getSummonerData('neamarDoesNotExists', 'euw', function(err) {
        if(!err) {
          return done(new Error("Expected an error to occur."));
        }

        assert.equal(err.statusCode, 500);
        done();
      });
    });
  });

  describe('getSummonersData()', function() {
    before(function() {
      nock('https://euw.api.pvp.net')
        .get('/api/lol/euw/v1.4/summoner/70448430,19083089,19917877,57780340,53870009,19917878,27321542,78179191,38621938,79947339')
        .query(true)
        .reply(200, require('../mocks/summoners.json'));
    });

    it("should return summoner data", function(done) {
      summonerData.getSummonersData([70448430, 19083089, 19917877, 57780340, 53870009, 19917878, 27321542, 78179191, 38621938, 79947339], 'euw', function(err, data) {
        if(err) {
          return done(err);
        }

        assert.equal(Object.keys(data).length, 10);
        assert.equal(data[19083089].name, "N4dlPb");
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

  describe('getCurrentRanks()', function() {
    before(function() {
      nock('https://euw.api.pvp.net')
        .get('/api/lol/euw/v2.5/league/by-summoner/19083089,19917877/entry')
        .query(true)
        .reply(200, require('../mocks/league-entry.json'));

    });

    it("should return current rank for summoners", function(done) {
      summonerData.getCurrentRanks([19083089, 19917877], 'euw', function(err, data) {
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
