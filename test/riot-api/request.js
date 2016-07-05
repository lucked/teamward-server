"use strict";

var assert = require("assert");
var nock = require("nock");

var request = require('../../lib/riot-api/request.js');

describe("Riot queue requester", function() {
  it("should return results on valid reply from Riot's server", function(done) {
    nock('https://euw.api.pvp.net')
      .get('/fake')
      .query(true)
      .reply({}, {ok: true});

    request('EUW', '/fake', false, function(err, res) {
      if(err) {
        return done(err);
      }

      assert.equal(res.ok, true);
      done();
    });
  });

  it("should retry automatically after a 500", function(done) {
    nock('https://euw.api.pvp.net')
      .get('/fake')
      .query(true)
      .reply(500, {ok: false});

    nock('https://euw.api.pvp.net')
      .get('/fake')
      .query(true)
      .reply(200, {ok: true});

    request('EUW', '/fake', false, function(err, res) {
      if(err) {
        return done(err);
      }

      assert.equal(res.ok, true);
      done();
    });
  });

  it("should fail after a second 500", function(done) {
    nock('https://euw.api.pvp.net')
      .get('/fake')
      .query(true)
      .reply(500, {ok: false});

    nock('https://euw.api.pvp.net')
      .get('/fake')
      .query(true)
      .reply(500, {ok: true});

    request('EUW', '/fake', false, function(err) {
      if(!err) {
        return done(new Error("Expected an error to occur."));
      }

      assert.equal(err.statusCode, 500);
      done();
    });
  });

  it("should retry automatically after a 429", function(done) {
    nock('https://euw.api.pvp.net')
      .get('/fake')
      .query(true)
      .reply(429, {ok: false}, {'retry-after': '0.01'});

    nock('https://euw.api.pvp.net')
      .get('/fake')
      .query(true)
      .reply(200, {ok: true});

    request('EUW', '/fake', false, function(err, res) {
      if(err) {
        return done(err);
      }

      assert.equal(res.ok, true);
      done();
    });
  });
});
