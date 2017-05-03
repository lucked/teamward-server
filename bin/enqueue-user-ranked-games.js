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
      mongoose.model('Token').find({}).read('secondaryPreferred').select('_id token summonerName summonerId region lastKnownGameId inGame').lean().exec(cb);
    },
    function addTokensToQueue(tokens, cb) {
      var games = {};
      var count = 0;
      async.eachLimit(tokens.slice(0,200), 50, function(token, cb) {
        summonerInfo.getAllRankedMatches(token.summonerId, token.region, function(err, matches) {
          if(err) {
            return cb(err);
          }

          (matches.matches || []).forEach(function(match) {
            games[token.region.toLowerCase() + match.matchId] = {
              id: match.matchId,
              region: token.region.toLowerCase()
            };
          });

          count += 1;
          console.log(count, tokens.length);
          cb();
        });
      }, function(err) {
        cb(err, games);
      });
    },
    function enqueue(games, cb) {
      console.log("TOTAL GAMES", Object.keys(games).length);
      fjq.create(Object.keys(games).map(k => games[k]), cb);
    }
], function(err) {
  if(err) {
    throw err;
  }

  console.log("DONE");
  process.exit(0);
});
