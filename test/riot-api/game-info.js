"use strict";

var nock = require('nock');
var assert = require('assert');
var gameInfo = require('../../lib/riot-api/game-info');


describe("Game info", function() {
  it("should return current game information", function(done) {
    nock('https://euw.api.pvp.net')
      .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/70448430')
      .query(true)
      .reply(200, require('../mocks/get-spectator-game-info.json'));

    gameInfo.getCurrentGame(70448430, 'euw', function(err, data) {
      if(err) {
        return done(err);
      }

      assert.equal(data.mapId, 11);
      assert.equal(data.participants.length, 10);
      done();
    });
  });

  it("should return 404 while not in game", function(done) {
    nock('https://euw.api.pvp.net')
      .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/70448430')
      .query(true)
      .reply(404, require('../mocks/get-spectator-game-info-404.json'));

    gameInfo.getCurrentGame(70448430, 'euw', function(err) {
      if(!err) {
        return done(new Error("Expected an error."));
      }

      assert.equal(err.statusCode, 404);
      done();
    });
  });
});
