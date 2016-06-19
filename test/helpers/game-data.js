"use strict";

var nock = require('nock');
var assert = require('assert');
var gameData = require('../../lib/helper/game-data');


describe("Game data", function() {
  before(function() {
    nock('https://euw.api.pvp.net')
      .get('/observer-mode/rest/consumer/getSpectatorGameInfo/EUW1/70448430')
      .query(true)
      .reply(200, require('../mocks/get-spectator-game-info.json'))
      .get('/api/lol/euw/v2.5/league/by-summoner/70448430,19083089,19917877,57780340,53870009,19917878,27321542,78179191,38621938,79947339/entry')
      .query(true)
      .reply(200, require('../mocks/league-entry.json'))
      .get('/api/lol/euw/v1.4/summoner/70448430,19083089,19917877,57780340,53870009,19917878,27321542,78179191,38621938,79947339')
      .query(true)
      .reply(200, require('../mocks/summoners.json'));

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
    gameData('70448430', 'euw', function(err, data) {
      if(err) {
        return done(err);
      }

      require('fs').writeFileSync('/tmp/game.json', JSON.stringify(data));

      assert.equal(data.map_id, 11);
      assert.equal(data.teams.length, 2);
      assert.equal(data.teams[0].team_id, 100);
      assert.equal(data.teams[0].players[0].champion.name, 'Illaoi');
      assert.equal(data.teams[0].players[0].champion.ad, 8);
      assert.equal(data.teams[0].players[0].champion.ap, 3);
      assert.equal(data.teams[0].players[0].summoner.name, 'Neamar');
      assert.equal(data.teams[0].players[0].summoner.level, 30);
      assert.equal(data.teams[0].players[0].spell_d.name, 'Flash');
      assert.equal(data.teams[0].players[1].current_season_rank.tier, 'GOLD');
      done();
    });
  });

  it.skip("should fail for unknown summoners");
  it.skip("should fail for summoners not in game");
});
