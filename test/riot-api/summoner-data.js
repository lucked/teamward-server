"use strict";

var summonerData = require('../../lib/riot-api/summoner-data');
var assert = require('assert');


describe("Summoner data", function() {
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
