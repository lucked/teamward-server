'use strict';

var log = require('debug')('teamward:summoner-info');
var riotRequest = require('./request');
var duration = require('../helper/duration');

// Returns data about the specified summoner
module.exports.getSummonerData = function getSummonerData(summonerName, region, cb) {
  var endpoint = '/lol/summoner/v3/summoners/by-name/' + encodeURIComponent(summonerName);

  riotRequest(riotRequest.getPlatformFromRegion(region), endpoint, duration.SIX_HOURS, function(err, data) {
    if(err) {
      if(err && err.statusCode === 404) {
        return cb(null, null);
      }
      return cb(err);
    }

    cb(null, data);
  });
};


// Returns champions played by this summoner
module.exports.getChampions = function getTopChampions(summonerId, region, cb) {
  var endpoint = '/lol/champion-mastery/v3/champion-masteries/by-summoner/' + summonerId;

  riotRequest(riotRequest.getPlatformFromRegion(region), endpoint, duration.AN_HOUR, cb);
};


// Return league and tier information for current season
module.exports.getCurrentRank = function getCurrentRank(summonerId, region, cb) {
  var endpoint = '/lol/league/v3/leagues/by-summoner/' + summonerId;
  riotRequest(riotRequest.getPlatformFromRegion(region), endpoint, duration.SIX_HOURS, function(err, data) {
    // If no player in the game has ever played any ranked, we get a 404 that we can safely ignore
    if(err && err.statusCode === 404) {
      log("Requiring ranked data on unranked players, returning empty.");
      // Note that this is not cached, since the API assume this is an error ><
      err = null;
      data = [];
    }

    var usefulData = data.reduce((acc, queue) => {
      acc[queue.queue] = queue.entries.find((e) => parseInt(e.playerOrTeamId) === summonerId);
      acc[queue.queue].tier = queue.tier;
      return acc;
    }, {});
    cb(err, usefulData);
  });
};

// Returns ranked games with specified champion
module.exports.getRecentRankedMatchesWithChampion = function getRecentRankedMatches(accountId, region, championId, cb) {
  var endpoint = '/lol/match/v3/matchlists/by-account/' + accountId + '?beginIndex=0&endIndex=5&champion=' + championId;

  riotRequest(riotRequest.getPlatformFromRegion(region), endpoint, cb);
};
