'use strict';

var riotRequest = require('./request');


module.exports.getCurrentGame = function getCurrentGame(summonerId, region, cb) {
  var endpoint = '/lol/spectator/v3/active-games/by-summoner/' + summonerId;

  riotRequest(riotRequest.getPlatformFromRegion(region), endpoint, cb);
};


module.exports.getExistingGame = function getExistingGame(gameId, region, cb) {
  var endpoint = '/lol/match/v3/matches/' + gameId;

  riotRequest(riotRequest.getPlatformFromRegion(region), endpoint, cb);
};


module.exports.getMatchList = function getMatchList(accountId, region, count, cb) {
  var endpoint = '/lol/match/v3/matchlists/by-account/' + accountId + "?beginIndex=0&endIndex=" + count;

  riotRequest(riotRequest.getPlatformFromRegion(region), endpoint, cb);
};
