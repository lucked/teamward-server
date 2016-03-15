"use strict";

var nock = require('nock');
var assert = require('assert');
var summonerData = require('../../lib/riot-api/summoner-data');


describe("Summoner data", function() {
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
