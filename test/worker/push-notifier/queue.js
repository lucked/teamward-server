"use strict";

var assert = require("assert");
var mongoose = require("mongoose");
var async = require("async");
var sinon = require("sinon");
var pushNotifierQueue = require('../../../lib/worker/push-notifier/queue.js');

var Token = mongoose.model('Token');

describe("pushNotifier queue", function() {
  beforeEach(function clearDB(done) {
    mongoose.model('Token').remove({}, done);
  });

  beforeEach(function clearRedis(done) {
    pushNotifierQueue.fjq.clearAll(done);
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
    this.sandbox.stub(pushNotifierQueue.fjq, 'create', function(jobs, cb) {
      cb();
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
        var options = {
          testing: true,
          thunderingHerdSpan: 0,
        };
        options.cb = cb;

        pushNotifierQueue(options);
      },
      function(tokenCounter, cb) {

        assert.equal(tokenCounter, 3);
        // 3 tokens (in one create) + one refill = 2
        sinon.assert.callCount(pushNotifierQueue.fjq.create, 2);
        assert.equal(pushNotifierQueue.fjq.create.getCall(0).args[0].length, 3);
        assert.equal(pushNotifierQueue.fjq.create.getCall(1).args[0].refillQueue, true);

        cb();
      },
    ], done);
  });
});
