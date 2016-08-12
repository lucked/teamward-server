"use strict";

// rolesChampion is an array of mongoDb champions,
// masteredChampions an array from summonerInfo.getChampions()
module.exports = function(rolesChampions, masteredChampions, role, cb) {

  // We'll need easy access to the roles champions by id, so format it as an object
  var rolesChampionsHash = rolesChampions.reduce(function(acc, champion) {
    acc[champion._id] = champion;

    return acc;
  }, {});

  // Idem for masteredChampions
  var masteredChampionsHash = masteredChampions.reduce(function(acc, champion) {
    acc[champion.championId] = champion;

    return acc;
  }, {});

  // First, clean the masteredChampions to only include champions actually played in this role
  masteredChampions = masteredChampions.filter(function(champion) {
    return champion.championId in rolesChampionsHash;
  });

  var counters = rolesChampions.map(function(champion) {
    // Find the worst (it's inverted, remember) win rate against a champion present in masteredChampions
    var matchups = champion.getMatchups(role);
    matchups.sort(function(c1, c2) {
      return c1.winRate > c2.winRate;
    });

    var bestCounter = matchups.find(function(champion) {
      // Return true for the first item in masteredChampions
      return champion.id in masteredChampionsHash;
    });

    if(!bestCounter) {
      return {
        counter: null,
        winRate: null,
        champion: {
          id: champion._id,
          name: champion.name
        },
      };
    }

    return {
      counter: {
        id: bestCounter.id,
        name: bestCounter.name,
      },
      winRate: 100 - bestCounter.winRate,
      champion: {
        id: champion._id,
        name: champion.name
      },
    };
  });


  cb(null, counters);
};
