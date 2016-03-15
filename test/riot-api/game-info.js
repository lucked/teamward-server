"use strict";

var nock = require('nock');
var assert = require('assert');
var gameInfo = require('../../lib/riot-api/game-info');


describe("Game info", function() {
  before(function() {
    nock('https://euw.api.pvp.net')
      .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/78179191')
      .query(true)
      .reply(200, require('../mocks/get-spectator-game-info.json'));
  });

  it("should return current game information", function(done) {
    gameInfo.getCurrentGame(78179191, 'euw', function(err, data) {
      if(err) {
        return done(err);
      }

      assert.equal(data.mapId, 11);
      assert.equal(data.participants.length, 10);
      done();
    });
  });
});
