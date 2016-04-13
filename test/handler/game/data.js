"use strict";

var nock = require('nock');
var supertest = require('supertest');

var app = require('../../../app');

describe("Main server", function() {
  describe("GET /game/data", function() {
    before(function() {
      nock('https://euw.api.pvp.net')
        .get('/api/lol/euw/v1.4/summoner/by-name/neamar')
        .query(true)
        .reply(200, require('../../mocks/summoner-by-name.json'))
        .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/70448430')
        .query(true)
        .reply(404, require('../../mocks/get-spectator-game-info-not-in-game.json'));
    });

    it("should require summoner name", function(done) {
      supertest(app)
        .get('/game/data')
        .expect(409)
        .expect(/summoner param/i)
        .end(done);
    });

    it("should require region param", function(done) {
      supertest(app)
        .get('/game/data?summoner=neamar')
        .expect(409)
        .expect(/region param/i)
        .end(done);
    });

    it("should succeed with summoner and region param", function(done) {
      supertest(app)
        .get('/game/data?summoner=neamar&region=euw')
        // Expect 404, nocking a not in game situation
        .expect(404)
        .end(done);
    });
  });
});
