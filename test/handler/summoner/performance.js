"use strict";

var assert = require('assert');

var app = require('../../../app');
var recorder = require('../../mocks/recorder.js');

var supertest = require('supertest');

describe("Main server", function() {
  describe("GET /summoner/performance", function() {
    it("should require summoner name", function(done) {
      supertest(app)
        .get('/summoner/performance')
        .expect(409)
        .expect(/summoner param/i)
        .end(done);
    });

    it("should require region param", function(done) {
      supertest(app)
        .get('/summoner/performance?summoner=neamar')
        .expect(409)
        .expect(/region param/i)
        .end(done);
    });

    it("should require champion param", function(done) {
      supertest(app)
        .get('/summoner/performance?summoner=neamar&region=euw')
        .expect(409)
        .expect(/champion param/i)
        .end(done);
    });

    it("should require champion param to exist", function(done) {
      done = recorder.useNock(this, done);
      supertest(app)
        .get('/summoner/performance?summoner=neamar&region=euw&champion=helmetbro')
        //.expect(404)
        .expect(/unknown champion/i)
        .end(done);
    });

    it("should fail for unknown summoner", function(done) {
      done = recorder.useNock(this, done);

      supertest(app)
        .get('/summoner/performance?summoner=404summ&region=euw&champion=Kled')
        .expect(404)
        .expect(/summoner does not exist/i)
        .end(done);
    });

    it("should succeed with all params", function(done) {
      done = recorder.useNock(this, done);

      supertest(app)
        .get('/summoner/performance?summoner=riotneamar&region=euw&champion=Kled')
        // .expect(200)
        .expect(function(res) {
          assert.equal(res.body.matches.length, 7);
          assert.equal(res.body.matches[0].victory, true);
          assert.equal(res.body.matches[0].ward.id, 3340);
          assert.equal(res.body.matches[0].items.length, 6);
          assert.equal(res.body.matches[0].items[0].id, 1055);
        })
        .end(done);
    });
  });
});
