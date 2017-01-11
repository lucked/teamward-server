"use strict";

var assert = require("assert");
var mongoose = require("mongoose");
var async = require("async");
var sinon = require("sinon");
var nock = require('nock');
var rarity = require("rarity");

var pushNotifierWorker = require('../../../lib/worker/push-notifier/worker.js');
var gameData = require('../../../lib/helper/game-data.js');


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

        pushNotifier({testing: true}, cb);
      },
      function(tokenCounter, tokenNotifiedCounter, cb) {
        assert.equal(tokenCounter, 1);
        assert.equal(tokenNotifiedCounter, 0);

        cb();
      }
    ], done);
  });

  it("should send a notification when player is in game", function(done) {
    var fakeGameData = require('../mocks/mocks/custom_get-spectator-game-info.json');
    async.waterfall([
      saveDummyToken,
      function(token, count, cb) {
        nock('https://euw.api.pvp.net')
          .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/' + token.summonerId)
          .query(true)
          .reply(200, fakeGameData);

        sinon.stub(gameData, 'buildExternalGameData', function() {});
        sinon.stub(pushNotifier.gcm, 'send', stubGcmSender);

        pushNotifier({testing: true}, rarity.carry([token], cb));
      },
      function(token, tokenCounter, tokenNotifiedCounter, cb) {
        assert.equal(tokenCounter, 1);
        assert.equal(tokenNotifiedCounter, 1);
        sinon.assert.calledOnce(gameData.buildExternalGameData);
        sinon.assert.calledOnce(pushNotifier.gcm.send);
        assert.equal(pushNotifier.gcm.send.firstCall.args[0].registration_id, token.token);
        assert.equal(pushNotifier.gcm.send.firstCall.args[0]['data.gameId'], fakeGameData.gameId);

        cb(null, token);
      },
      function reloadToken(token, cb) {
        Token.findById(token._id, cb);
      },
      function ensureTokenHasBeenUpdated(token, cb) {
        assert.equal(token.inGame, true);
        assert.equal(token.lastKnownGameId, fakeGameData.gameId);

        cb();
      }
    ], function(err) {
      // Always restore functionality
      gameData.buildExternalGameData.restore();
      pushNotifier.gcm.send.restore();

      done(err);
    });
  });

  it("should not send a notification when player is already in game", function(done) {
    var fakeGameData = require('../mocks/mocks/custom_get-spectator-game-info.json');
    var token = getDummyToken();
    token.inGame = true;
    token.lastKnownGameId = fakeGameData.gameId;

    async.waterfall([
      async.apply(saveDummyToken, token),
      function(token, count, cb) {
        nock('https://euw.api.pvp.net')
          .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/' + token.summonerId)
          .query(true)
          .reply(200, fakeGameData);

        sinon.stub(gameData, 'buildExternalGameData', function() {});
        sinon.stub(pushNotifier.gcm, 'send', stubGcmSender);

        pushNotifier({testing: true}, cb);
      },
      function(tokenCounter, tokenNotifiedCounter, cb) {
        assert.equal(tokenCounter, 1);
        assert.equal(tokenNotifiedCounter, 0);
        assert.equal(gameData.buildExternalGameData.callCount, 0);
        assert.equal(pushNotifier.gcm.send.callCount, 0);

        cb();
      }
    ], function(err) {
      // Always restore functionality
      gameData.buildExternalGameData.restore();
      pushNotifier.gcm.send.restore();

      done(err);
    });
  });

  it("should send a notification when player is out of game", function(done) {
    var token = getDummyToken();
    token.inGame = true;
    token.lastKnownGameId = 123456;

    async.waterfall([
      async.apply(saveDummyToken, token),
      function(token, count, cb) {
        nock('https://euw.api.pvp.net')
          .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/' + token.summonerId)
          .query(true)
          .reply(404, {ok: false});

        sinon.stub(pushNotifier.gcm, 'send', stubGcmSender);

        pushNotifier({testing: true}, rarity.carry([token], cb));
      },
      function(token, tokenCounter, tokenNotifiedCounter, cb) {
        assert.equal(tokenCounter, 1);
        assert.equal(tokenNotifiedCounter, 0);
        sinon.assert.calledOnce(pushNotifier.gcm.send);
        assert.equal(pushNotifier.gcm.send.firstCall.args[0].registration_id, token.token);
        assert.equal(pushNotifier.gcm.send.firstCall.args[0]['data.removeGameId'], token.lastKnownGameId);

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
    ], function(err) {
      // Always restore functionality
      pushNotifier.gcm.send.restore();

      done(err);
    });
  });

  it("should remove token when not registered on GCM anymore", function(done) {
    var fakeGameData = require('../mocks/mocks/custom_get-spectator-game-info.json');

    async.waterfall([
      saveDummyToken,
      function(token, count, cb) {
        nock('https://euw.api.pvp.net')
          .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/' + token.summonerId)
          .query(true)
          .reply(200, fakeGameData);

        sinon.stub(gameData, 'buildExternalGameData', function() {});
        sinon.stub(pushNotifier.gcm, 'send', function(message, cb) {
          process.nextTick(function() {
            cb(new Error("NotRegistered error"));
          });
        });

        pushNotifier({testing: true}, rarity.carry([token], cb));
      },
      function(token, tokenCounter, tokenNotifiedCounter, cb) {
        assert.equal(tokenCounter, 1);
        assert.equal(tokenNotifiedCounter, 0);
        sinon.assert.calledOnce(pushNotifier.gcm.send);

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
    ], function(err) {
      // Always restore functionality
      gameData.buildExternalGameData.restore();
      pushNotifier.gcm.send.restore();

      done(err);
    });
  });
});
