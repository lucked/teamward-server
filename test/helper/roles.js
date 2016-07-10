"use strict";

var assert = require('assert');

var rolesHelper = require('../../lib/helper/roles');

describe("Role helper", function() {
  describe("guessRoles()", function() {

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
