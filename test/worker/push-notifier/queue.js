"use strict";

var assert = require("assert");
var mongoose = require("mongoose");
var async = require("async");
var nock = require('nock');
var pushNotifierQueue = require('../../../lib/worker/push-notifier/queue.js');
var kue = require("kue");

var Token = mongoose.model('Token');

describe("pushNotifier queue", function() {
  beforeEach(function clearDB(done) {
    mongoose.model('Token').remove({}, done);
  });

  beforeEach(function clearRedis(done) {
    kue.createQueue();

    kue.Job.range(0, 100000, 'asc', function(err, jobs) {
      async.eachLimit(jobs, 30, function(j, cb) {
        j.remove(cb);
      }, done);
    });
  });

  var getDummyToken = function() {
    var token = new Token();
    token.region = "euw";
    token.summonerName = "dummysummoner";
    token.token = "dummytoken" + getDummyToken.i;
    token.summonerProfileId = 12;
    token.summonerId = 123;

    getDummyToken.i += 1;
    return token;
  };
  getDummyToken.i = 0;

  var saveDummyToken = function(t, cb) {
    if(!cb) {
      cb = t;
      t = getDummyToken();
    }
    t.save(cb);
  };

  it("should iterate over all tokens", function(done) {
    var options = {
      testing: true
    };

    async.waterfall([
      function(cb) {
        async.parallel([
          saveDummyToken,
          saveDummyToken,
          saveDummyToken
        ], cb);
      },
      function(res, cb) {
        nock('https://euw.api.pvp.net')
          .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/' + res[0].summonerId)
          .query(true)
          .reply(404, {ok: false});
        nock('https://euw.api.pvp.net')
          .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/' + res[0].summonerId)
          .query(true)
          .reply(404, {ok: false});
        nock('https://euw.api.pvp.net')
          .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/' + res[0].summonerId)
          .query(true)
          .reply(404, {ok: false});

        options.cb = cb;
        pushNotifierQueue(options);
      },
      function(tokenCounter, cb) {
        assert.equal(tokenCounter, 3);

        cb();
      },
    ], done);
  });
});
