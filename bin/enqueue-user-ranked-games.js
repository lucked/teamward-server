"use strict";
var async = require("async");
var mongoose = require("mongoose");
var FJQ = require("featureless-job-queue");
require('./_common');
require('../app');
var config = require('../config/');

var fjq = new FJQ({
  redisUrl: config.redisUrl,
  redisKey: 'download-games:jobs'
});

var summonerInfo = require('../lib/riot-api/summoner-info.js');


async.waterfall([
  function findAllTokens(cb) {
    mongoose.model('Token').find({}).read('secondaryPreferred').select('_id summonerName summonerId region').lean().exec(cb);
  },
  function addTokensToQueue(tokens, cb) {
    async.eachLimit(tokens, 10, function(token, cb) {
      summonerInfo.getAllRankedMatches(token.summonerId, token.region, function(err, matches) {
        if(err) {
          // Skip user and move to next one.
          console.warn(err.toString());
          return cb();
        }

        if(!matches) {
          return cb();
        }

        matches.matches = matches.matches || [];

        console.log("Got " + matches.matches.length + " ranked games for " + token.summonerName);

        var jobs = matches.matches.map(function(match) {
          return {
            id: match.matchId,
            region: token.region.toLowerCase()
          };
        });

        fjq.create(jobs, cb);
      });
    }, cb);
  },
], function(err) {
  if(err) {
    throw err;
  }

  console.log("DONE");
  process.exit(0);
});
