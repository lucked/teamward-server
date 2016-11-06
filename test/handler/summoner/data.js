"use strict";

var assert = require('assert');

var app = require('../../../app');
var recorder = require('../../mocks/recorder.js');

var supertest = require('supertest');

describe("Main server", function() {
  describe("GET /summoner/data", function() {
    it("should require summoner name", function(done) {
      supertest(app)
        .get('/summoner/data')
        .expect(409)
        .expect(/summoner param/i)
        .end(done);
    });

    it("should require region param", function(done) {
      supertest(app)
        .get('/summoner/data?summoner=neamar')
        .expect(409)
        .expect(/region param/i)
        .end(done);
    });

    it("should fail for unknown summoner", function(done) {
      done = recorder.useNock(this, done);

      supertest(app)
        .get('/summoner/data?summoner=404summ&region=euw')
        .expect(404)
        .expect(/summoner does not exist/i)
        .end(done);
    });

    it("should succeed with summoner and region param", function(done) {
      done = recorder.useNock(this, done);

      supertest(app)
        .get('/summoner/data?summoner=neamar&region=euw')
        .expect(200)
        .expect(function(res) {
          assert.equal(res.body.name, 'Neamar');
          assert.equal(res.body.profileIcon, 'https://ddragon.leagueoflegends.com/cdn/6.13.1/img/profileicon/26.png');
        })
        .end(done);
    });
  });
});
