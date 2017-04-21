"use strict";
var async = require("async");
var mongoose = require("mongoose");

// Builds an array, with summoner data (level, name) of each participant
module.exports = function summonersData(region, summonerIds, cb) {
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
      tokens.forEach((t) => ret[t.summonerId] = true);

      cb(null, ret);
    }
  ], cb);
};
