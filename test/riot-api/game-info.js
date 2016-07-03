"use strict";

var nock = require('nock');
var assert = require('assert');
var gameInfo = require('../../lib/riot-api/game-info');
var recorder = require('../mocks/recorder');


describe("Game info", function() {
  describe("getCurrentGame()", function() {
    it("should return current game information", function(done) {
      nock('https://euw.api.pvp.net')
        .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/70448430')
        .query(true)
        .reply(200, require('../mocks/get-spectator-game-info.json'));

      gameInfo.getCurrentGame(70448430, 'euw', function(err, data) {
        if(err) {
          return done(err);
        }

        assert.equal(data.gameId, 2564363999);
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

  describe("getExistingGame()", function() {
    it("should return existing game information", function(done) {
      done = recorder.useNock(this, done);

      gameInfo.getExistingGame(2718749954, 'euw', function(err, data) {
        if(err) {
          return done(err);
        }

        assert.equal(data.matchId, 2718749954);
        assert.equal(data.mapId, 11);
        assert.equal(data.participants.length, 10);
        done();
      });
    });
  });
});
