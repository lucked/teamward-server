'use strict';

var nock = require('nock');
var assert = require('assert');
var championInfo = require('../../lib/ddragon/champion-info');


describe("Champion info", function() {
  before(function() {
    nock('http://ddragon.leagueoflegends.com')
      .get('/realms/euw.json')
      .reply(200, require('../mocks/realms.json'))
      .get('/cdn/6.5.1/data/en_US/champion.json')
      .reply(200, require('../mocks/champions.json'));
  });

  it("should return champion information", function(done) {
    championInfo.getChampionData('euw', 420, function(err, data) {
      if(err) {
        return done(err);
      }

      assert.equal(data.id, 'Illaoi');
      done();
    });
  });
});
