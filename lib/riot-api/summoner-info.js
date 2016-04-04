'use strict';

var riotRequest = require('./request');

// Returns data about the specified summoner
module.exports.getSummonerData = function getSummonerData(summonerName, region, cb) {
  var endpoint = '/api/lol/' + region.toLowerCase() + '/v1.4/summoner/by-name/' + encodeURIComponent(summonerName);

  riotRequest(region, endpoint, true, function(err, data) {
    if(err) {
      return cb(err);
    }

    cb(null, data[Object.keys(data)[0]]);
  });
};


// Returns data about the specified summoner
module.exports.getSummonersData = function getSummonerData(summonerIds, region, cb) {
  var endpoint = '/api/lol/' + region.toLowerCase() + '/v1.4/summoner/' + summonerIds.join(',');

  riotRequest(region, endpoint, true, cb);
};


// Returns champions played by this summoner
module.exports.getChampions = function getTopChampions(summonerId, region, cb) {
  var endpoint = '/championmastery/location/' + region.toUpperCase() + '1/player/' + summonerId + '/champions';

  riotRequest(region, endpoint, true, cb);
};


module.exports.getCurrentRanks = function getCurrentRank(summonerIds, region, cb) {
  var endpoint = '/api/lol/' + region.toLowerCase() + '/v2.5/league/by-summoner/' + summonerIds.join(',') + '/entry';

  riotRequest(region, endpoint, true, cb);
};
