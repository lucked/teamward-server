'use strict';

var riotRequest = require('./request');

// Returns data about the specified summoner
// See documentation for https://euw.api.pvp.net/api/lol/euw/v2.2/summoner/by-name/neamar
module.exports.getSummonerData = function getSummonerData(summonerName, region, cb) {
  var endpoint = '/api/lol/' + region + '/v2.2/summoner/by-name/' + encodeURIComponent(summonerName);

  riotRequest(endpoint, cb);
};
