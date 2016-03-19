"use strict";

var nock = require('nock');
var assert = require('assert');
var gameData = require('../../lib/helpers/game-data');


describe("Game data", function() {
  before(function() {
    nock('https://euw.api.pvp.net')
      .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/70448430')
      .query(true)
      .reply(200, require('../mocks/get-spectator-game-info.json'))
      .get('/api/lol/euw/v1.4/summoner/by-name/neamar')
      .query(true)
      .reply(200, require('../mocks/summoner-by-name.json'))
      .get('/api/lol/euw/v2.5/league/by-summoner/70448430,19083089,19917877,57780340,53870009,219773652,27321542,78179191,38621938,79947339/entry')
      .query(true)
      .reply(200, require('../mocks/league-entry.json'));

    // Fake the same reply for each call to /champions
    var participants = require('../mocks/get-spectator-game-info.json').participants;
    participants.forEach(function(participant) {
      nock('https://euw.api.pvp.net')
        .get('/championmastery/location/EUW1/player/' + participant.summonerId + '/champions')
        .query(true)
        .reply(200, require('../mocks/summoner-champions.json'));
    });

    nock('http://ddragon.leagueoflegends.com')
      .get('/realms/euw.json')
      .reply(200, require('../mocks/realms.json'))
      .get('/cdn/6.5.1/data/en_US/summoner.json')
      .reply(200, require('../mocks/spells.json'))
      .get('/cdn/6.5.1/data/en_US/champion.json')
      .reply(200, require('../mocks/champions.json'));
  });

  it("should return current game data", function(done) {
    gameData('neamar', 'euw', function(err, data) {
      if(err) {
        return done(err);
      }

      assert.equal(data.mapId, 11);
      assert.equal(data.participants.length, 10);
      assert.equal(data.participants[0].champion.name, 'Illaoi');
      assert.equal(data.participants[0].summoner.name, 'Neamar');
      assert.equal(data.participants[0].spellD.name, 'Flash');
      assert.equal(data.participants[1].currentSeasonRank.tier, 'GOLD');
      done();
    });
  });
});
