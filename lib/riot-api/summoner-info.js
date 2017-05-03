'use strict';

var log = require('debug')('teamward:summoner-info');
var riotRequest = require('./request');
var duration = require('../helper/duration');

// Returns data about the specified summoner
module.exports.getSummonerData = function getSummonerData(summonerName, region, cb) {
  var endpoint = '/api/lol/' + region.toLowerCase() + '/v1.4/summoner/by-name/' + encodeURIComponent(summonerName);

  riotRequest(region, endpoint, duration.AN_HOUR, function(err, data) {
    if(err) {
      if(err && err.statusCode === 404) {
        return cb(null, null);
      }
      return cb(err);
    }

    if(!data) {
      err = new Error("Issues with the Riot API :( [EMPTY_SUMM_DATA]");
      err.riotInternal = true;
      return cb(err);
    }

    cb(null, data[Object.keys(data)[0]]);
  });
};


// Returns data about the specified summoners (up to 10)
module.exports.getSummonersData = function getSummonerData(summonerIds, region, cb) {
  var endpoint = '/api/lol/' + region.toLowerCase() + '/v1.4/summoner/' + summonerIds.join(',');

  riotRequest(region, endpoint, duration.FIVE_MINUTES, cb);
};


// Returns champions played by this summoner
module.exports.getChampions = function getTopChampions(summonerId, region, cb) {
  var endpoint = '/championmastery/location/' + riotRequest.getPlatformFromRegion(region) + '/player/' + summonerId + '/champions';

  riotRequest(region, endpoint, duration.FIVE_MINUTES, cb);
};


// Return league and tier information for current season
module.exports.getCurrentRanks = function getCurrentRank(summonerIds, region, cb) {
  var endpoint = '/api/lol/' + region.toLowerCase() + '/v2.5/league/by-summoner/' + summonerIds.join(',') + '/entry';
  riotRequest(region, endpoint, duration.AN_HOUR, function(err, data) {
    // If no player in the game has ever played any ranked, we get a 404 that we can safely ignore
    if(err && err.statusCode === 404) {
      log("Requiring ranked data on unranked players, returning empty.");
      // Note that this is not cached, since the API assume this is an error ><
      err = null;
      data = {};
    }

    cb(err, data);
  });
};


// Return last 10 matches from summoner
module.exports.getRecentMatches = function getRecentMatches(summonerId, region, cb) {
  var endpoint = '/api/lol/' + region.toLowerCase() + '/v1.3/game/by-summoner/' + summonerId + '/recent';

  riotRequest(region, endpoint, duration.FIVE_MINUTES, cb);
};

// Returns ranked games with specified champion
module.exports.getRecentRankedMatches = function getRecentRankedMatches(summonerId, region, championId, cb) {
  var endpoint = '/api/lol/' + region.toLowerCase() + '/v2.2/matchlist/by-summoner/' + summonerId + '?beginIndex=0&endIndex=5&championIds=' + championId;

  riotRequest(region, endpoint, cb);
};

// Returns all ranked games from this summoner
module.exports.getAllRankedMatches = function getRecentRankedMatches(summonerId, region, cb) {
  var endpoint = '/api/lol/' + region.toLowerCase() + '/v2.2/matchlist/by-summoner/' + summonerId;

  riotRequest(region, endpoint, cb);
};
