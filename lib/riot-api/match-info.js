'use strict';

var riotRequest = require('./request');
var duration = require('../helper/duration');


// Returns data about the specified summoner
module.exports.getMatchData = function getMatchData(matchId, region, cb) {
  var endpoint = '/api/lol/' + region.toLowerCase() + '/v2.2/match/' + matchId;

  riotRequest(region, endpoint, duration.AN_HOUR, cb);
};
