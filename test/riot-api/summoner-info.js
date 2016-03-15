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

        assert.ok(data.neamar);
        assert.equal(data.neamar.summonerName, 'neamar');
        assert.equal(data.neamar.accountId, 219773652);
        done();
      });
    });
  });

  describe('getTopChampions()', function() {
    before(function() {
      nock('https://euw.api.pvp.net')
        .get('/championmastery/location/EUW1/player/70448430/topchampions')
        .query(true)
        .reply(200, require('../mocks/top-champions.json'));
    });

    it("should return top champions for summoner", function(done) {
      summonerData.getTopChampions(70448430, 'euw', function(err, data) {
        if(err) {
          return done(err);
        }

        assert.equal(data.length, 3);
        assert.equal(data[0].championId, 420);
        done();
      });
    });
  });

});
