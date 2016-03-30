'use strict';

var riotRequest = require('./request');

// Returns data about the specified summoner
// See documentation for https://euw.api.pvp.net/api/lol/euw/v2.2/summoner/by-name/neamar
module.exports.getCurrentGame = function getCurrentGame(summonerId, region, cb) {
  // TODO: handle region with many platforms (e.g. LA1 / LA2)
  var endpoint = '/observer-mode/rest/consumer/getSpectatorGameInfo/' + region.toUpperCase() + '1/' + summonerId;

  riotRequest(region, endpoint, cb);
};
