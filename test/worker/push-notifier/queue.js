"use strict";

var assert = require("assert");
var mongoose = require("mongoose");
var async = require("async");
var nock = require('nock');
var sinon = require("sinon");

var pushNotifierQueue = require('../../../lib/worker/push-notifier/queue.js');
var kue = require("kue");

var Token = mongoose.model('Token');

describe("pushNotifier queue", function() {
  var queue;
  beforeEach(function clearDB(done) {
    mongoose.model('Token').remove({}, done);
  });

  beforeEach(function clearRedis(done) {
    queue = kue.createQueue();

    kue.Job.range(0, 100000, 'asc', function(err, jobs) {
      async.eachLimit(jobs, 30, function(j, cb) {
        j.remove(cb);
      }, done);
    });
  });

  beforeEach(function() {
    this.sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    this.sandbox.restore();
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
    // Create a (complex) stub
    this.sandbox.stub(queue, 'create', function() {
      var stub = {
        ttl: () => stub,
        delay: () => stub,
        removeOnComplete: () => stub,
        save: function(cb) {
          cb();
          return stub;
        }
      };

      return stub;
    });

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

        var options = {
          testing: true
        };
        options.cb = cb;
        pushNotifierQueue(options);
      },
      function(tokenCounter, cb) {
        assert.equal(tokenCounter, 3);
        // 3 tokens + one refill = 4
        sinon.assert.callCount(queue.create, 4);
        assert.equal(queue.create.getCall(0).args[0], "checkInGame");
        assert.equal(queue.create.getCall(1).args[0], "checkInGame");
        assert.equal(queue.create.getCall(2).args[0], "checkInGame");
        assert.equal(queue.create.getCall(3).args[0], "refillQueue");

        cb();
      },
    ], done);
  });
});
