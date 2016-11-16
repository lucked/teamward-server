'use strict';

var log = require('debug')('teamward:summoner-info');
var riotRequest = require('./request');
var regionToPlatform = require('../helper/region-to-platform.js');
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
      return cb(new Error("Issues with the Riot API :( [EMPTY_SUMM_DATA]"));
    }

    cb(null, data[Object.keys(data)[0]]);
  });
};


// Returns data about the specified summoner
module.exports.getSummonersData = function getSummonerData(summonerIds, region, cb) {
  var endpoint = '/api/lol/' + region.toLowerCase() + '/v1.4/summoner/' + summonerIds.join(',');

  riotRequest(region, endpoint, duration.FIVE_MINUTES, cb);
};


// Returns champions played by this summoner
module.exports.getChampions = function getTopChampions(summonerId, region, cb) {
  var endpoint = '/championmastery/location/' + regionToPlatform(region) + '/player/' + summonerId + '/champions';

  riotRequest(region, endpoint, duration.AN_HOUR, cb);
};


// Return league and tier information for current season
module.exports.getCurrentRanks = function getCurrentRank(summonerIds, region, cb) {
  var endpoint = '/api/lol/' + region.toLowerCase() + '/v2.5/league/by-summoner/' + summonerIds.join(',') + '/entry';

  riotRequest(region, endpoint, duration.AN_HOUR, function(err, data) {
    // If no player in the game has ever played any ranked, we get a 404 that we can safely ignore
    if(err && err.toString().indexOf("404") !== -1) {
      log("Requiring ranked data on unranked players, returning empty.");
      err = null;
      data = {};
    }

    cb(err, data);
  });
};


// Return last 10 matches from summoner
module.exports.getRecentMatches = function getRecentMatches(summonerId, region, cb) {
  var endpoint = '/api/lol/' + region.toLowerCase() + '/v1.3/game/by-summoner/' + summonerId + '/recent';

  riotRequest(region, endpoint, duration.THIRTY_MINUTES, cb);
};
