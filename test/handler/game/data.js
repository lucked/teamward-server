"use strict";

var app = require('../../../app');
var supertest = require('supertest');

describe("Main server", function() {
  describe("GET /game/data", function() {
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
        .expect(200)
        .end(done);
    });
  });
});
