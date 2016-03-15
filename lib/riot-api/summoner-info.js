'use strict';

var riotRequest = require('./request');

// Returns data about the specified summoner
module.exports.getSummonerData = function getSummonerData(summonerName, region, cb) {
  var endpoint = '/api/lol/' + region + '/v2.2/summoner/by-name/' + encodeURIComponent(summonerName);

  riotRequest(endpoint, cb);
};


// Returns top 3 champions played by this summoner
module.exports.getTopChampions = function getTopChampions(summonerId, platform, cb) {
  var endpoint = '/championmastery/location/' + platform.toUpperCase() + '1/player/' + summonerId + '/topchampions';

  riotRequest(endpoint, cb);
};
