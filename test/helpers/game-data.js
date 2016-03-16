"use strict";

var nock = require('nock');
var assert = require('assert');
var gameData = require('../../lib/helpers/game-data');


describe.skip("Game data", function() {
  before(function() {
    nock('https://euw.api.pvp.net', {allowUnmocked: true})
      .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/70448430')
      .query(true)
      .reply(200, require('../mocks/get-spectator-game-info.json'))
      .get('/api/lol/euw/v2.2/summoner/by-name/neamar')
      .query(true)
      .reply(200, require('../mocks/summoner-by-name.json'));
  });

  it("should return current game data", function(done) {
    gameData('neamar', 'euw', function(err, data) {
      if(err) {
        return done(err);
      }

      assert.equal(data.mapId, 11);
      assert.equal(data.participants.length, 10);
      done();
    });
  });
});
