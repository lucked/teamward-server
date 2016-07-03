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

    it("should succeed with summoner and region param", function(done) {
      done = recorder.setupNock(this, done);

      supertest(app)
        .get('/summoner/data?summoner=neamar&region=euw')
        .expect(200)
        .expect(function(res) {
          assert.equal(res.body.name, 'neamar');
          assert.equal(res.body.profileIcon, 'http://ddragon.leagueoflegends.com/cdn/6.5.1/img/profileicon/26.png');
        })
        .end(done);
    });
  });
});
