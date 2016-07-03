"use strict";

var recorder = require('../mocks/recorder.js');
var assert = require('assert');
var gameData = require('../../lib/helper/game-data');


describe("Game data", function() {

  it("should return current game data", function(done) {
    var rec = recorder.setupNock(this);
    var fakeGameData = require('../mocks/get-spectator-game-info.json');
    gameData.buildExternalGameData(fakeGameData, 'euw', function(err, data) {
      if(err) {
        return done(err);
      }
      rec();

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
      assert.equal(data.teams[0].players[1].current_season_rank.tier, 'PLATINUM');
      done();
    });
  });

  it.skip("should fail for unknown summoners");
  it.skip("should fail for summoners not in game");
});
