"use strict";

var supertest = require('supertest');
var sinon = require('sinon');
var assert = require("assert");

var app = require('../../../app');
var gameData = require('../../../lib/helper/game-data');
var recorder = require('../../mocks/recorder');

describe("Main server", function() {
  describe("GET /game/data", function() {
    before(function() {
      gameData._buildExternalGameData = gameData.buildExternalGameData;
      gameData.buildExternalGameData = sinon.spy(function(gameDAta, region, cb) {
        cb(null, {stub: true});
      });
    });

    after(function() {
      gameData.buildExternalGameData = gameData._buildExternalGameData;
      delete gameData._buildExternalGameData;
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
      done = recorder.useNock(this, done);

      supertest(app)
        .get('/game/data?summoner=amoki&region=euw')
        .expect(200)
        .expect(function(res) {
          assert.ok(res.body.stub);
          assert.ok(gameData.buildExternalGameData.calledOnce);
        })
        .end(done);
    });

    it("should fail for unknown summoners", function(done) {
      done = recorder.useNock(this, done);

      supertest(app)
        .get('/game/data?summoner=neamardoesnotexists&region=euw')
        .expect(404)
        .expect(/summoner does not exist/i)
        .end(done);
    });

    it("should fail for summoners not in game", function(done) {
      done = recorder.useNock(this, done);

      supertest(app)
        .get('/game/data?summoner=neamar&region=euw')
        .expect(404)
        .expect(/summoner not in game/i)
        .end(done);
    });


  });
});
