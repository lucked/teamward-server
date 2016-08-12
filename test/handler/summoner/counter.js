"use strict";

var assert = require('assert');

var app = require('../../../app');
// var recorder = require('../../mocks/recorder.js');

var supertest = require('supertest');

describe("Main server", function() {
  describe("GET /summoner/counter", function() {
    it("should require summoner name", function(done) {
      supertest(app)
        .get('/summoner/counter')
        .expect(409)
        .expect(/summoner param/i)
        .end(done);
    });

    it("should require region param", function(done) {
      supertest(app)
        .get('/summoner/counter?summoner=neamar')
        .expect(409)
        .expect(/region param/i)
        .end(done);
    });

    it("should require role param", function(done) {
      supertest(app)
        .get('/summoner/counter?summoner=neamar&region=euw')
        .expect(409)
        .expect(/role param/i)
        .end(done);
    });

    it("should require role param to exist", function(done) {
      supertest(app)
        .get('/summoner/counter?summoner=neamar&region=euw&role=DANCE')
        .expect(409)
        .expect(/invalid role param/i)
        .end(done);
    });

    it("should require level param", function(done) {
      supertest(app)
        .get('/summoner/counter?summoner=neamar&region=euw&role=TOP')
        .expect(409)
        .expect(/level param/i)
        .end(done);
    });

    it("should require level param to be an integer", function(done) {
      supertest(app)
        .get('/summoner/counter?summoner=neamar&region=euw&role=TOP&level=LOL')
        .expect(409)
        .expect(/invalid level param/i)
        .end(done);
    });

    it("should require level param to be less than 7", function(done) {
      supertest(app)
        .get('/summoner/counter?summoner=neamar&region=euw&role=TOP&level=15')
        .expect(409)
        .expect(/invalid level param/i)
        .end(done);
    });

    it("should succeed with all params", function(done) {
      // done = recorder.useNock(this, done);

      supertest(app)
        .get('/summoner/counter?summoner=riotneamar&region=euw&role=TOP&level=5')
        .expect(200)
        .expect(function(res) {
          assert.equal(res.body.name, 'Neamar');
          assert.equal(res.body.profileIcon, 'http://ddragon.leagueoflegends.com/cdn/6.13.1/img/profileicon/26.png');
        })
        .end(done);
    });
  });
});
