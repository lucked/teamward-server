'use strict';

var nock = require('nock');
var assert = require('assert');
var ddragonInfo = require('../../lib/ddragon');


describe("Ddragon info", function() {
  describe("Champion info", function() {
    before(function() {
      nock('http://ddragon.leagueoflegends.com')
        .get('/realms/euw.json')
        .reply(200, require('../mocks/realms.json'))
        .get('/cdn/6.5.1/data/en_US/champion.json')
        .reply(200, require('../mocks/champions.json'));
    });

    it("should return champion information", function(done) {
      ddragonInfo.getChampionData('euw', 420, function(err, data) {
        if(err) {
          return done(err);
        }

        assert.equal(data.id, 'Illaoi');
        done();
      });
    });

    it("should cache champion information", function(done) {
      nock('http://ddragon.leagueoflegends.com')
        .get('/realms/euw.json')
        .reply(404)
        .get('/cdn/6.5.1/data/en_US/champion.json')
        .reply(404);

      ddragonInfo.getChampionData('euw', 420, function(err, data) {
        if(err) {
          return done(err);
        }

        assert.equal(data.id, 'Illaoi');

        nock.cleanAll();
        done();
      });
    });

  });

  describe("Summoner spell info", function() {
    before(function() {
      nock('http://ddragon.leagueoflegends.com')
        .get('/realms/euw.json')
        .reply(200, require('../mocks/realms.json'))
        .get('/cdn/6.5.1/data/en_US/summoner.json')
        .reply(200, require('../mocks/spells.json'));
    });

    it("should return summoner spelll information", function(done) {
      ddragonInfo.getSummonerSpellData('euw', 4, function(err, data) {
        if(err) {
          return done(err);
        }

        assert.equal(data.id, 'SummonerFlash');
        done();
      });
    });
  });
});
