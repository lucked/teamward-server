"use strict";

var assert = require("assert");
var mongoose = require("mongoose");
var async = require("async");
var nock = require('nock');
var pushNotifier = require('../../lib/worker/push-notifier.js');

var Token = mongoose.model('Token');

describe("Worker: pushNotifier", function() {
  beforeEach(function clearDB(done) {
    mongoose.model('Token').remove({}, done);
  });

  var getDummyToken = function() {
    var token = new Token();
    token.region = "euw";
    token.summonerName = "dummysummoner";
    token.token = "dummytoken";
    token.summonerProfileId = 12;
    token.summonerId = 123;
    return token;
  };

  var saveDummyToken = function(cb) {
    getDummyToken().save(cb);
  };

  it("should do nothing when player is not in game", function(done) {
    async.waterfall([
      saveDummyToken,
      function(token, count, cb) {
        nock('https://euw.api.pvp.net')
          .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/' + token.summonerId)
          .query(true)
          .reply(404, {ok: false});

        pushNotifier({testing: true}, cb);
      },
      function(tokenCounter, tokenNotifiedCounter, cb) {
        assert.equal(tokenCounter, 1);
        assert.equal(tokenNotifiedCounter, 0);

        cb();
      }
    ], done);
  });
});
