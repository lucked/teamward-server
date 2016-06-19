'use strict';

var riotRequest = require('./request');
var regionToPlatform = require('../helper/region-to-platform.js');

// Returns data about the specified summoner
// See documentation for https://euw.api.pvp.net/api/lol/euw/v2.2/summoner/by-name/neamar
module.exports.getCurrentGame = function getCurrentGame(summonerId, region, cb) {
  var endpoint = '/observer-mode/rest/consumer/getSpectatorGameInfo/' + regionToPlatform(region) + '/' + summonerId;

  riotRequest(region, endpoint, cb);
};

module.exports.getExistingGame = function getExistingGame(gameId, region, cb) {
  var endpoint = '/api/lol/' + region + '/v2.2/match/' + gameId;

  riotRequest(region, endpoint, cb);
};
