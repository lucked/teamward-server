"use strict";

var assert = require("assert");
var mongoose = require("mongoose");
var async = require("async");
var sinon = require("sinon");
var nock = require('nock');

var pushNotifier = require('../../lib/worker/push-notifier.js');
var gameData = require('../../lib/helper/game-data.js');


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
        sinon.stub(pushNotifier.gcm, 'send', function(message, cb) {
          assert.equal(message.registration_id, token.token);
          assert.equal(message['data.gameId'], fakeGameData.gameId);

          process.nextTick(function() {
            cb(null, "fakemessageid");
          });
        });

        pushNotifier({testing: true}, cb);
      },
      function(tokenCounter, tokenNotifiedCounter, cb) {
        assert.equal(tokenCounter, 1);
        assert.equal(tokenNotifiedCounter, 1);
        sinon.assert.calledOnce(gameData.buildExternalGameData);
        sinon.assert.calledOnce(pushNotifier.gcm.send);

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
