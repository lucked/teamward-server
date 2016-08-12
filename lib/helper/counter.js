"use strict";

// rolesChampion is an array of mongoDb champions,
// masteredChampions an array from summonerInfo.getChampions()
module.exports = function(rolesChampions, masteredChampions, role, cb) {

  // We'll need easy access to the roles champions by id, so format it as an object
  var rolesChampionsHash = rolesChampions.reduce(function(acc, champion) {
    acc[champion._id] = champion;

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
      return c1.winRate < c2.winRate;
    });

    console.log(matchups);
  });

  console.log(masteredChampions);

  cb(null, counters);
};
