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
      return c1.winRate - c2.winRate;
    });

    var knownCounters = matchups.filter(function(champion) {
      return champion.id in masteredChampionsHash;
    }).map(function(champion) {
      return {
        id: champion.id,
        name: champion.name,
        winRate: 100 - champion.winRate,
        mastery: masteredChampionsHash[champion.id].championLevel
      };
    });

    var roleData = champion.roleData[role.toUpperCase()];
    return {
      champion: {
        id: champion._id.toString(),
        name: champion.name,
        patch: champion.patch,
        winRate: roleData.winrate,
        gamesCount: roleData.gamesCount,
        percentPlayInRole: roleData.percentPlayInRole,
      },
      counters: knownCounters,
    };
  });


  counters.sort(function(c1, c2) {
    return c1.champion.name.localeCompare(c2.champion.name);
  });

  cb(null, counters);
};
