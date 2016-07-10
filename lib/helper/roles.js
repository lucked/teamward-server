"use strict";

// Guess the role from everyone in the team
// module.exports.guessRoles = function(team, cb) {

// };

function getDefaultRolesObject() {
  return {
    TOP: null,
    MID: null,
    JUNGLE: null,
    BOT: null,
    SUPPORT: null,
  };
}

module.exports.computeRoles = function(originalTeam, championsRolesChoices) {
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
      console.log("Init, affecting " + onlyChampion.id + " to " + role);
    }
  });

  // don't forget to remove them from the team list:
  Object.keys(roles).forEach(function(role) {
    if(roles[role]) {
      roles[role]._roles = [role];
      team.splice(team.indexOf(roles[role]), 1);
    }
  });

  console.log("Expected matchup post init:", roles);

  while(hasFoundSomethingOnLastIteration) {
    hasFoundSomethingOnLastIteration = false;
    for(var i = 0; i < team.length; i += 1) {
      var champion = team[i];

      if(champion._roles.length === 1 && roles[champion._roles[0]]) {
        console.log("Double bind!");
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
        console.log("Affecting " + champion.id + " to " + role);
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

  console.log("Expected matchup:", originalTeam);
  return originalTeam;
};
