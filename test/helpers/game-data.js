"use strict";

var nock = require('nock');
var assert = require('assert');
var gameData = require('../../lib/helpers/game-data');


describe.skip("Game data", function() {
  before(function() {
    nock('https://euw.api.pvp.net')
      .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/70448430')
      .query(true)
      .reply(200, require('../mocks/get-spectator-game-info.json'))
      .get('/api/lol/euw/v2.2/summoner/by-name/neamar')
      .query(true)
      .reply(200, require('../mocks/summoner-by-name.json'));

    // Fake the same reply for each call to /champions
    var participants = require('../mocks/get-spectator-game-info.json').participants;
    participants.forEach(function(participant) {
      nock('https://euw.api.pvp.net')
        .get('/championmastery/location/EUW1/player/' + participant.summonerId + '/champions')
        .query(true)
        .reply(200, require('../mocks/champions.json'));
    });
  });

  it("should return current game data", function(done) {
    gameData('neamar', 'euw', function(err, data) {
      if(err) {
        return done(err);
      }

      assert.equal(data.mapId, 11);
      assert.equal(data.participants.length, 10);
      done();
    });
  });
});
