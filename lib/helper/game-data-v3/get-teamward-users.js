"use strict";
var async = require("async");
var mongoose = require("mongoose");

var config = require('../../../config/');

/**
 * @param summonerIds array of summonerIds
 * @param region
 * Return an object in the callback,
 * keys are summonerIds,
 * values a boolean, true if users uses teamward
 */
module.exports = function getTeamwardUsers(summonerIds, region, cb) {
  async.waterfall([
    function getTokens(cb) {
      mongoose.model('Token').find({
        region: 'euw',
        summonerId: {
          $in: summonerIds
        }
      })
      .select('summonerId')
      .exec(cb);
    },
    function formatTokens(tokens, cb) {
      var ret = {};
      summonerIds.forEach(s => ret[s] = false);
      tokens.forEach(t => ret[t.summonerId] = true);
      config.teamwardUsersOverride.forEach((t) => ret[t] = true);

      cb(null, ret);
    }
  ], cb);
};
