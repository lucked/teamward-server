'use strict';

var nock = require('nock');
var assert = require('assert');
var ddragonInfo = require('../../lib/ddragon');
var recorder = require('../mocks/recorder.js');


describe("Ddragon info", function() {
  describe("Champion info", function() {
    it("should return champion information", function(done) {
      done = recorder.setupNock(this, done);
      ddragonInfo.getChampionData('euw', 420, function(err, data) {
        if(err) {
          return done(err);
        }

        assert.equal(data.id, 'Illaoi');
        done();
      });
    });

    it("should cache champion information", function(done) {
      done = recorder.setupNock(this, done);

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

        done();
      });
    });

  });

  describe("Summoner spell info", function() {

    it("should return summoner spelll information", function(done) {
      done = recorder.setupNock(this, done);
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
