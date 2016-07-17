"use strict";

var async = require("async");
var mongoose = require("mongoose");

var log = require("debug")("teamward:role-inference");


// Guess the role from everyone in the team
// Team is an array of player
module.exports.guessRoles = function(team, cb) {
  var Champion = mongoose.model('Champion');

  // Ensure that whatever happens, there is always a 'role' key on the champion
  team.forEach(function(player) {
    player.champion.role = '?';
  });

  if(team.length !== 5) {
    process.nextTick(function() {
      cb(new Error("Role data only exist for games on Summoner's Rift"));
    });

    return;
  }

  async.waterfall([
    function getDataFromDb(cb) {
      var championIds = team.map(function(player) {
        return player.champion.id;
      });

      Champion.where('_id').in(championIds).exec(cb);
    },
    function(championsRoles, cb) {
      if(championsRoles.length !== 5) {
        return cb(new Error("Unable to get role data"));
      }

      // Transform array to hash map
      var championsRolesChoices = {};
      championsRoles.forEach(function(championData) {
        championsRolesChoices[championData.id] = championData.roles;
      });

      // Filter to only use champion information
      var champions = team.map(function(player) {
        return player.champion;
      });

      // Actual computation
      module.exports.computeRoles(champions, championsRolesChoices);

      cb(null, team);
    }
  ], cb);
};

function getDefaultRolesObject() {
  return {
    TOP: null,
    MID: null,
    JUNGLE: null,
    BOT: null,
    SUPPORT: null,
  };
}

module.exports.computeRoles = function computeRoles(originalTeam, championsRolesChoices) {
  // Copy original team array
  var team = originalTeam.map(function(i) {
    i._roles = championsRolesChoices[i.id];
    return i;
  });

  var hasFoundSomethingOnLastIteration = true;
  var isInDoubleBind = false;
  var roles = getDefaultRolesObject();

  // On first iteration only, find roles with only one person available and prefill them
  Object.keys(roles).forEach(function(role) {
    var filterFunction = function(champion) {
      return champion._roles.indexOf(role) !== -1;
    };

    var availableChampionsForThisRole = team.filter(filterFunction);

    if(availableChampionsForThisRole.length === 1) {
      var onlyChampion = team.find(filterFunction);
      roles[role] = onlyChampion;
      log("Init, affecting " + onlyChampion.name + " to " + role);
    }
  });

  // don't forget to remove them from the team list:
  Object.keys(roles).forEach(function(role) {
    if(roles[role]) {
      roles[role]._roles = [role];
      team.splice(team.indexOf(roles[role]), 1);
    }
  });

  while(hasFoundSomethingOnLastIteration) {
    hasFoundSomethingOnLastIteration = false;
    for(var i = 0; i < team.length; i += 1) {
      var champion = team[i];

      if(champion._roles.length === 1 && roles[champion._roles[0]]) {
        log("Double bind on " + champion._roles[0] + "! (" + champion.name + " / " + roles[champion._roles[0]].name + ")");
        isInDoubleBind = true;
        hasFoundSomethingOnLastIteration = false;
        roles = getDefaultRolesObject();
        break;
      }
      // Remove roles already taken
      champion._roles = champion._roles.filter(function(role) {
        return !roles[role];
      });

      if(champion._roles.length === 1) {
        var role = champion._roles[0];
        log("Affecting " + champion.name + " to " + role);
        hasFoundSomethingOnLastIteration = true;
        roles[role] = champion;
        champion._roles = [role];
        team.splice(i, 1);
        break;
      }
    }
  }

  originalTeam.forEach(function(champion) {
    if(!isInDoubleBind && champion._roles.length === 1) {
      champion.role = champion._roles[0];
    }
    else {
      champion.role = "?";
    }

    delete champion._roles;
  });

  return originalTeam;
};
