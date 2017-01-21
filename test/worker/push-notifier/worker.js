"use strict";

var assert = require("assert");
var mongoose = require("mongoose");
var async = require("async");
var sinon = require("sinon");
var nock = require('nock');
var rarity = require("rarity");

var pushNotifierWorker = require('../../../lib/worker/push-notifier/worker.js');
var gameData = require('../../../lib/helper/game-data.js');

var mockGameData = require('../../mocks/mocks/custom_get-spectator-game-info.json');

var Token = mongoose.model('Token');

describe("pushNotifier worker", function() {
  beforeEach(function clearDB(done) {
    mongoose.model('Token').remove({}, done);
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
    token.token = "dummytoken";
    token.summonerProfileId = 12;
    token.summonerId = 123;
    return token;
  };

  var saveDummyToken = function(t, cb) {
    if(!cb) {
      cb = t;
      t = getDummyToken();
    }
    t.save(cb);
  };

  var stubGcmSender = function(message, cb) {
    process.nextTick(function() {
      cb(null, "fakemessageid");
    });
  };

  it("should do nothing when player is not in game", function(done) {
    async.waterfall([
      saveDummyToken,
      function(token, count, cb) {
        nock('https://euw.api.pvp.net')
          .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/' + token.summonerId)
          .query(true)
          .reply(404, {ok: false});

        pushNotifierWorker({data: {token: token}}, cb);
      },
      function(notified, cb) {
        assert.equal(notified, 0);

        cb();
      }
    ], done);
  });

  it("should send a notification when player is in game", function(done) {
    this.sandbox.stub(gameData, 'buildExternalGameData', function(res, region, cb) {
      cb();
    });
    this.sandbox.stub(pushNotifierWorker.gcm, 'send', stubGcmSender);

    async.waterfall([
      saveDummyToken,
      function(token, count, cb) {
        nock('https://euw.api.pvp.net')
          .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/' + token.summonerId)
          .query(true)
          .reply(200, mockGameData);

        pushNotifierWorker({data: {token: token}}, rarity.carry([token], cb));
      },
      function(token, notified, cb) {
        assert.equal(notified, 1);
        sinon.assert.calledOnce(gameData.buildExternalGameData);
        sinon.assert.calledOnce(pushNotifierWorker.gcm.send);
        assert.equal(pushNotifierWorker.gcm.send.firstCall.args[0].registration_id, token.token);
        assert.equal(pushNotifierWorker.gcm.send.firstCall.args[0]['data.gameId'], mockGameData.gameId);

        cb(null, token);
      },
      function reloadToken(token, cb) {
        Token.findById(token._id, cb);
      },
      function ensureTokenHasBeenUpdated(token, cb) {
        assert.equal(token.inGame, true);
        assert.equal(token.lastKnownGameId, mockGameData.gameId);

        cb();
      }
    ], done);
  });

  it("should not send a notification when player is already in game", function(done) {
    var token = getDummyToken();
    token.inGame = true;
    token.lastKnownGameId = mockGameData.gameId;

    this.sandbox.stub(gameData, 'buildExternalGameData', function(res, region, cb) {
      cb();
    });
    this.sandbox.stub(pushNotifierWorker.gcm, 'send', stubGcmSender);

    async.waterfall([
      async.apply(saveDummyToken, token),
      function(token, count, cb) {
        nock('https://euw.api.pvp.net')
          .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/' + token.summonerId)
          .query(true)
          .reply(200, mockGameData);

        pushNotifierWorker({data: {token: token}}, cb);
      },
      function(notified, cb) {
        assert.equal(notified, 0);
        assert.equal(gameData.buildExternalGameData.callCount, 0);
        assert.equal(pushNotifierWorker.gcm.send.callCount, 0);

        cb();
      }
    ], done);
  });

  it("should send a notification when player is out of game", function(done) {
    var token = getDummyToken();
    token.inGame = true;
    token.lastKnownGameId = 123456;

    this.sandbox.stub(pushNotifierWorker.gcm, 'send', stubGcmSender);

    async.waterfall([
      async.apply(saveDummyToken, token),
      function(token, count, cb) {
        nock('https://euw.api.pvp.net')
          .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/' + token.summonerId)
          .query(true)
          .reply(404, {ok: false});

        pushNotifierWorker({data: {token: token}}, rarity.carry([token], cb));
      },
      function(token, notified, cb) {
        assert.equal(notified, 0);
        sinon.assert.calledOnce(pushNotifierWorker.gcm.send);
        assert.equal(pushNotifierWorker.gcm.send.firstCall.args[0].registration_id, token.token);
        assert.equal(pushNotifierWorker.gcm.send.firstCall.args[0]['data.removeGameId'], token.lastKnownGameId);

        cb(null, token);
      },
      function reloadToken(token, cb) {
        Token.findById(token._id, cb);
      },
      function ensureTokenHasBeenUpdated(reloadedToken, cb) {
        assert.equal(reloadedToken.inGame, false);
        assert.equal(reloadedToken.lastKnownGameId, token.lastKnownGameId);

        cb();
      }
    ], done);
  });

  it("should remove token when not registered on GCM anymore", function(done) {
    this.sandbox.stub(gameData, 'buildExternalGameData', function(res, region, cb) {
      cb();
    });
    this.sandbox.stub(pushNotifierWorker.gcm, 'send', function(message, cb) {
      process.nextTick(function() {
        cb(new Error("NotRegistered error"));
      });
    });

    async.waterfall([
      saveDummyToken,
      function(token, count, cb) {
        nock('https://euw.api.pvp.net')
          .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/' + token.summonerId)
          .query(true)
          .reply(200, mockGameData);

        pushNotifierWorker({data: {token: token}}, rarity.carry([token], cb));
      },
      function(token, notified, cb) {
        assert.equal(notified, 0);
        sinon.assert.calledOnce(pushNotifierWorker.gcm.send);

        process.nextTick(function() {
          cb(null, token);
        });
      },
      function reloadToken(token, cb) {
        Token.findById(token._id, cb);
      },
      function ensureTokenHasBeenRemoved(token, cb) {
        assert.equal(token, null);

        cb();
      }
    ], done);
  });
});
