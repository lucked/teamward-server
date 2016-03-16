'use strict';

var riotRequest = require('./request');

// Returns data about the specified summoner
module.exports.getSummonerData = function getSummonerData(summonerName, region, cb) {
  var endpoint = '/api/lol/' + region + '/v2.2/summoner/by-name/' + encodeURIComponent(summonerName);

  riotRequest(endpoint, function(err, data) {
    if(err) {
      return cb(err);
    }

    cb(null, data[Object.keys(data)[0]]);
  });
};


// Returns champions played by this summoner
module.exports.getChampions = function getTopChampions(summonerId, platform, cb) {
  var endpoint = '/championmastery/location/' + platform.toUpperCase() + '1/player/' + summonerId + '/champions';

  riotRequest(endpoint, cb);
};


module.exports.getCurrentRank = function getCurrentRank(summonerId, platform, cb) {
  var endpoint = '/api/lol/euw/v2.5/league/by-summoner/' + summonerId + '/entry';

  riotRequest(endpoint, cb);
};


module.exports.getCurrentRanks = function getCurrentRank(summonerIds, platform, cb) {
  var endpoint = '/api/lol/euw/v2.5/league/by-summoner/' + summonerIds.join(',') + '/entry';

  riotRequest(endpoint, cb);
};
