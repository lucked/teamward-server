"use strict";


/**
 * Recursive function for premade,
 * premadeData holds all data (same premadeData used in getPremade())
 * initialSet contains the set that's currently being built of premades,
 * currentSet is the set we're currently following (can be deep nested)
 * recursedSet contains the list of ids we've already examined in the current pass to avoid infinite loop
 * For instance, A played with B and B played with C.
 * getPremade() will call this function with premadeData, new Set("A"), premadeData["A"], new Set()
 * premadeData["A"] is Set([B]), which will now recurse into C.
*/
function recursePremade(premadeData, initialSet, currentSet, recursedSet) {
  Array.from(currentSet.values()).forEach(function(knownPlayer) {
    knownPlayer = knownPlayer.toString();
    if(!recursedSet.has(knownPlayer)) {
      initialSet.add(knownPlayer);
      recursedSet.add(knownPlayer);
      // Ensure we have the necessary data. Sometimes the Riot API won't return match history data, and we won't have any premade data for a summoner
      if(premadeData[knownPlayer] && premadeData[knownPlayer].knownPlayers) {
        recursePremade(premadeData, initialSet, premadeData[knownPlayer].knownPlayers, recursedSet);
      }
    }
  });

  return initialSet;
}


module.exports.getPremade = function(premadeData) {
  // Build an easy to use object
  // by grouping the sets through common keys
  // Not that sets are not transitive (A plays with B only in dataset,
  // but C plays with A so set should be {A,B,C} even though B is not directly mentioned)
  var premade = {};

  Object.keys(premadeData).forEach(function(summonerId) {
    var summonerPremadeData = premadeData[summonerId];
    var teamId = summonerPremadeData.teamId;
    if(!premade[teamId]) {
      premade[teamId] = [];
    }

    var teamMates = Object.keys(premadeData).reduce(function(acc, summonerId) {
      if(premadeData[summonerId].teamId === teamId) {
        acc[summonerId] = true;
      }

      return acc;
    }, {});

    var knownPremadesForTeam = premade[summonerPremadeData.teamId];

    // Only work on current teammates
    var currentSet = new Set();
    summonerPremadeData.knownPlayers.forEach(function(id) {
      if(teamMates[id]) {
        currentSet.add(id);
      }
    });

    var potentialPremade = recursePremade(premadeData, new Set([summonerId.toString()]), currentSet, new Set());

    // Find a group where user already is
    var currentGroup = knownPremadesForTeam.find(function(premade) {
      for(var id of potentialPremade.values()) {
        if(premade.has(id)) {
          return true;
        }
      }

      return false;
    });

    if(!currentGroup) {
      // That's the first time we're seeing this premade, just add it
      // Build best premade guess we can make from here
      currentGroup = potentialPremade;
      knownPremadesForTeam.push(currentGroup);
    }

    // Non transitive case, we need to merge the two groups
    for(var id of potentialPremade) {
      currentGroup.add(id);
    }
  });

  // We're nearly done! Let's just order by premade size
  // and replace Set with standard arrays
  Object.keys(premade).forEach(function(teamId) {
    var premades = premade[teamId];
    premades.sort(function(p1, p2) {
      // Bigger size first
      return p2.size - p1.size;
    });

    premade[teamId] = premades.map(function(someSet) {
      return Array.from(someSet.values()).map(function(summonerId) {
        return parseInt(summonerId);
      });
    });
  });

  return premade;
};
