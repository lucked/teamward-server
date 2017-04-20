"use strict";

var assert = require("assert");
var supertest = require('supertest');

var recorder = require('../mocks/recorder');
var app = require('../../app');

describe("Main server", function() {
  describe("GET /champion", function() {
    it("should return champion data", function(done) {
      done = recorder.useNock(this, done);
      supertest(app)
        .get('/champion/Illaoi')
        .expect(200)
        .expect(function(res) {
          assert.equal(res.body.name, "Illaoi");
          assert.equal(res.body.id, 420);
          assert.equal(res.body.spells.length, 4);
          assert.ok("image" in res.body.spells[0]);
          assert.ok("image" in res.body.passive);
          assert.ok(res.body.tips.length > 0);
        })
        .end(done);
    });

    it("should return champion data based on the locale", function(done) {
      done = recorder.useNock(this, done);
      supertest(app)
        .get('/champion/Illaoi?locale=fr_FR')
        .expect(200)
        .expect(function(res) {
          assert.equal(res.body.name, "Illaoi");
          assert.equal(res.body.spells[3].name, "Acte de foi");
        })
        .end(done);
    });
  });
});
