"use strict";

var app = require('../app');
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
  });
});
