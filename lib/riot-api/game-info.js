'use strict';

var riotRequest = require('./request');
var duration = require('../helper/duration');


// Returns data about the specified summoner
// See documentation for https://euw.api.riotgames.com/api/lol/euw/v2.2/summoner/by-name/neamar
module.exports.getCurrentGame = function getCurrentGame(summonerId, region, cb) {
  var endpoint = '/observer-mode/rest/consumer/getSpectatorGameInfo/' + riotRequest.getPlatformFromRegion(region) + '/' + summonerId;

  riotRequest(region, endpoint, cb);
};


module.exports.getExistingGame = function getExistingGame(gameId, region, cb) {
  var endpoint = '/api/lol/' + region + '/v2.2/match/' + gameId;

  riotRequest(region, endpoint, duration.TEN_MINUTES, cb);
};
