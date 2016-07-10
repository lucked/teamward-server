"use strict";

var mongoose = require("mongoose");
var assert = require('assert');
var async = require("async");
var rolesHelper = require('../../lib/helper/roles');

describe("Role helper", function() {
  var Champion = mongoose.model('Champion');
  describe("guessRoles()", function() {
    var buildFakePlayer = function(championId) {
      return {
        champion: {
          id: championId
        }
      };
    };

    before(function(done) {
      Champion.remove({}, done);
    });

    before(function(done) {
      var champions = [
        new Champion(),
        new Champion(),
        new Champion(),
        new Champion(),
        new Champion(),
      ];

      champions[0]._id = 0;
      champions[0].name = 'Illaoi';
      champions[0].roles = ['TOP'];

      champions[1]._id = 1;
      champions[1].name = 'Xerath';
      champions[1].roles = ['MID'];

      champions[2]._id = 2;
      champions[2].name = 'Lulu';
      champions[2].roles = ['SUPPORT'];

      champions[3]._id = 3;
      champions[3].name = 'Sejuani';
      champions[3].roles = ['JUNGLE'];

      champions[4]._id = 4;
      champions[4].name = 'Ashe';
      champions[4].roles = ['BOT'];

      async.each(champions, function(champion, cb) {
        champion.save(cb);
      }, done);
    });

    it("should error on team without exactly 5 players", function(done) {
      var team = [
        buildFakePlayer(0)
      ];

      rolesHelper.guessRoles(team, function(err) {
        if(!err) {
          return done(new Error("Expected an error!"));
        }

        assert.ok(err.toString().indexOf("Rift") !== -1);
        done();
      });
    });


    it("should append role data to the team object", function(done) {
      async.waterfall([
        function guess(cb) {
          var team = [
            buildFakePlayer(0),
            buildFakePlayer(1),
            buildFakePlayer(2),
            buildFakePlayer(3),
            buildFakePlayer(4),
          ];

          rolesHelper.guessRoles(team, cb);
        },
        function(team, cb) {
          assert.equal(team[0].champion.role, 'TOP');
          cb();
        }
      ], done);
    });
  });

  describe("computeRoles()", function() {
    it("should return obvious result when everything is straightforward", function() {
      var team = [
        {id: 'Illaoi'},
        {id: 'Xerath'},
        {id: 'Lulu'},
        {id: 'Sejuani'},
        {id: 'Ashe'},
      ];

      var championsRolesChoices = {
        'Illaoi': ['TOP'],
        'Xerath': ['MID'],
        'Lulu': ['SUPPORT'],
        'Sejuani': ['JUNGLE'],
        'Ashe': ['BOT'],
      };

      team = rolesHelper.computeRoles(team, championsRolesChoices);
      assert.equal(team[0].role, 'TOP');
      assert.equal(team[1].role, 'MID');
      assert.equal(team[2].role, 'SUPPORT');
      assert.equal(team[3].role, 'JUNGLE');
      assert.equal(team[4].role, 'BOT');
    });

    it("should return results when ambiguities can be resolved", function() {
      var team = [
        {id: 'Illaoi'},
        {id: 'Xerath'},
        {id: 'Lulu'},
        {id: 'Sejuani'},
        {id: 'Graves'},
      ];

      var championsRolesChoices = {
        'Illaoi': ['TOP'],
        'Xerath': ['MID'],
        'Lulu': ['SUPPORT'],
        'Sejuani': ['JUNGLE'],
        'Graves': ['BOT', 'JUNGLE'],
      };

      team = rolesHelper.computeRoles(team, championsRolesChoices);
      assert.equal(team[0].role, 'TOP');
      assert.equal(team[1].role, 'MID');
      assert.equal(team[2].role, 'SUPPORT');
      assert.equal(team[3].role, 'JUNGLE');
      assert.equal(team[4].role, 'BOT');
    });

    it("should return results with more complex inference ", function() {
      // Multiple inferrence will lead to a valid result, starting from Singed who is the only available TOP
      var team = [
        {id: 'Warwick'},
        {id: 'Singed'},
        {id: 'Twitch'},
        {id: 'Corki'},
        {id: 'Karma'},
      ];

      var championsRolesChoices = {
        'Warwick': ['TOP', 'JUNGLE'],
        'Singed': ['TOP'],
        'Twitch': ['BOT', 'JUNGLE'],
        'Corki': ['BOT', 'MID'],
        'Karma': ['MID', 'SUPPORT'],
      };

      team = rolesHelper.computeRoles(team, championsRolesChoices);
      assert.equal(team[0].role, 'JUNGLE');
      assert.equal(team[1].role, 'TOP');
      assert.equal(team[2].role, 'BOT');
      assert.equal(team[3].role, 'MID');
      assert.equal(team[4].role, 'SUPPORT');
    });

    it("should return results when only one person plays in a given role", function() {
      // Multiple inferences are not enough here, due to Quinn being TOP too with Warwick and Singed.
      // However, there is only one support and we can build the team from here
      var team = [
        {id: 'Warwick'},
        {id: 'Singed'},
        {id: 'Quinn'},
        {id: 'Corki'},
        {id: 'Karma'},
      ];

      var championsRolesChoices = {
        'Warwick': ['TOP', 'JUNGLE'],
        'Singed': ['TOP'],
        'Quinn': ['BOT', 'JUNGLE', 'TOP'],
        'Corki': ['BOT', 'MID'],
        'Karma': ['MID', 'SUPPORT'],
      };

      team = rolesHelper.computeRoles(team, championsRolesChoices);
      assert.equal(team[0].role, 'JUNGLE');
      assert.equal(team[1].role, 'TOP');
      assert.equal(team[2].role, 'BOT');
      assert.equal(team[3].role, 'MID');
      assert.equal(team[4].role, 'SUPPORT');
    });

    it("should fail on non-meta teams / double-bind", function() {
      // Multiple inferences are not enough here, due to Quinn being TOP too with Warwick and Singed.
      // However, there is only one support and we can build the team from here
      var team = [
        {id: 'Illaoi'},
        {id: 'Singed'},
        {id: 'Quinn'},
        {id: 'Corki'},
        {id: 'Karma'},
      ];

      var championsRolesChoices = {
        'Illaoi': ['TOP'],
        'Singed': ['TOP'],
        'Quinn': ['BOT', 'JUNGLE', 'TOP'],
        'Corki': ['BOT', 'MID'],
        'Karma': ['MID', 'SUPPORT'],
      };

      team = rolesHelper.computeRoles(team, championsRolesChoices);
      assert.equal(team[0].role, '?');
      assert.equal(team[1].role, '?');
      assert.equal(team[2].role, '?');
      assert.equal(team[3].role, '?');
      assert.equal(team[4].role, '?');
    });

    it("should try its best on fully ambiguous team", function() {
      // Multiple inferences are not enough here, due to Quinn being TOP too with Warwick and Singed.
      // However, there is only one support and we can build the team from here
      var team = [
        {id: 'Illaoi'},
        {id: 'Twitch'},
        {id: 'Quinn'},
        {id: 'Corki'},
        {id: 'Karma'},
      ];

      var championsRolesChoices = {
        'Illaoi': ['TOP'],
        'Twitch': ['BOT', 'JUNGLE'],
        'Quinn': ['BOT', 'JUNGLE', 'TOP'],
        'Corki': ['BOT', 'MID'],
        'Karma': ['MID', 'SUPPORT'],
      };

      team = rolesHelper.computeRoles(team, championsRolesChoices);
      assert.equal(team[0].role, 'TOP');
      assert.equal(team[1].role, '?');
      assert.equal(team[2].role, '?');
      assert.equal(team[3].role, '?');
      assert.equal(team[4].role, 'SUPPORT');
    });
  });
});
