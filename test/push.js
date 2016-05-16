"use strict";

var assert = require("assert");
var async = require("async");
var rarity = require("rarity");
var mongoose = require('mongoose');
var supertest = require('supertest');

var app = require('../app');

describe("Main server", function() {
  describe("GET /push", function() {
    var Token = mongoose.model('Token');

    // Empty token collection before getting started
    before(function(next) {
      Token.remove({}, next);
    });

    it("should require summoner name", function(done) {
      supertest(app)
        .get('/push')
        .expect(409)
        .expect(/summoner param/i)
        .end(done);
    });

    it("should require region param", function(done) {
      supertest(app)
        .get('/push?summoner=neamar')
        .expect(409)
        .expect(/region param/i)
        .end(done);
    });

    it("should require token param", function(done) {
      supertest(app)
        .get('/push?summoner=neamar&region=euw')
        .expect(409)
        .expect(/token param/i)
        .end(done);
    });

    it("should save Token with summoner, region and token param", function(done) {
      async.waterfall([
        function sendRequest(cb) {
          supertest(app)
            .get('/push?summoner=neamar&region=euw&token=123')
            .expect(204)
            .end(rarity.slice(1, cb));
        },
        function checkToken(cb) {
          Token.findOne({token: "123"}, rarity.slice(2, cb));
        },
        function ensureTokenSaved(token, cb) {
          assert.equal(token.summonerName, "neamar");
          assert.equal(token.region, "euw");

          cb();
        }
        ], done);
    });

    it("should overwrite existing token with new summoner, region and token param", function(done) {
      async.waterfall([
        function sendRequest(cb) {
          supertest(app)
            .get('/push?summoner=neamar2&region=na&token=123')
            .expect(204)
            .end(rarity.slice(1, cb));
        },
        function checkToken(cb) {
          Token.findOne({token: "123"}, rarity.slice(2, cb));
        },
        function ensureTokenSaved(token, cb) {
          assert.equal(token.summonerName, "neamar2");
          assert.equal(token.region, "na");

          cb();
        }
        ], done);
    });
  });
});
