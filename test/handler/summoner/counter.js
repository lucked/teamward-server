"use strict";

var assert = require('assert');
var mongoose = require("mongoose");

var app = require('../../../app');
var recorder = require('../../mocks/recorder.js');

var supertest = require('supertest');

describe("Main server", function() {
  var Champion = mongoose.model("Champion");

  before(function(done) {
    Champion.remove({}, done);
  });

  before(function(done) {
    var champion = new Champion();
    champion.roles = ['TOP'];
    champion._id = 39;
    champion.name = "Irelia";
    champion.topMatchups = [
      {
        winRate: 44,
        id: 420,
        name: 'Illaoi'
      }
    ];

    champion.save(done);
  });

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

    it("should fail for unknown summoner", function(done) {
      done = recorder.useNock(this, done);

      supertest(app)
        .get('/summoner/counter?summoner=404summ&region=euw&role=TOP&level=1')
        .expect(404)
        .expect(/summoner does not exist/i)
        .end(done);
    });

    it("should succeed with all params", function(done) {
      done = recorder.useNock(this, done);

      supertest(app)
        .get('/summoner/counter?summoner=riotneamar&region=euw&role=TOP&level=5')
        .expect(200)
        .expect(function(res) {
          assert.equal(res.body.counters[0].champion.id, 39);
          assert.equal(res.body.counters[0].counters[0].winRate, 56);
          assert.equal(res.body.counters[0].counters[0].id, 420);
        })
        .end(done);
    });
  });
});
