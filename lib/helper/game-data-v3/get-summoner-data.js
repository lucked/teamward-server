"use strict";
var fs = require("fs");
var async = require("async");
var FJQ = require("featureless-job-queue");
var rarity = require("rarity");

var config = require('../../../config/');
var summonerInfo = require('../../riot-api/summoner-info-v3.js');
var pool = require('../../model/sql/pool.js');
var lastSeasonRankQuery = fs.readFileSync(__dirname + '/../../model/sql/queries/game-data/last-season-rank.sql').toString();

var fjq = new FJQ({
  redisUrl: config.redisUrl,
  redisKey: 'download-games:jobs'
});

/**
 * @param participants an array of participants as returned by observer.
 * @param region
 * Return an object in the callback,
 * keys are summonerIds,
 * values an object with summoner details (rank, last season rank, level, ...)
 */
module.exports = function getSummonerData(participants, region, cb) {

  // Infer levels based on runes and masteries.
  // Anything at 30 is level 30 for sure.
  // Anything below 30 means summoner can be any level.
  var assumedLevels = participants.reduce((acc, p) => {
    acc[p.summonerId] = Math.max(
      p.runes.reduce((acc, r) => acc + r.count, 0),
      p.masteries.reduce((acc, r) => acc + r.rank, 0)
    );
    return acc;
  }, {});

  async.auto({
    enqueueUsers: function(cb) {
      var jobs = participants.map(p => {
        return {
          summonerName: p.summonerName,
          region: region
        };
      });
      fjq.create(jobs, cb);
    },
    rank: function(cb) {
      // Reduce doesn't work in parallel
      var acc = {};
      async.each(participants, function(p, cb) {
        summonerInfo.getCurrentRank(p.summonerId, region, function(err, data) {
          if(err) {
            return cb(err);
          }
          var queues = Object.keys(data);
          if(queues.length === 0) {
            return cb(null);
          }

          var mainQueue = data[queues[0]];
          acc[p.summonerId] = {
            tier: mainQueue.tier,
            division: mainQueue.rank,
            queue: queues[0],
          };

          cb(null);
        });
      }, rarity.carry([acc], cb));
    },
    level: function(cb) {
      // Reduce doesn't work in parallel
      var acc = {};
      async.each(participants, function(p, cb) {
        // If we know for sure player is level 30, don't do anything.
        if(assumedLevels[p.summonerId] === 30) {
          acc[p.summonerId] = 30;
          return cb(null);
        }

        // Otherwise, load information
        summonerInfo.getSummonerData(p.summonerName, region, function(err, data) {
          if(err) {
            return cb(err);
          }

          acc[p.summonerId] = data.summonerLevel;

          cb(null);
        });
      }, rarity.carry([acc], cb));
    },
    lastSeasonRank: function(cb) {
      pool().query(lastSeasonRankQuery, [participants.map(p => p.summonerId), region], function(err, res) {
        if(err) {
          return cb(err);
        }

        var r = res.rows.reduce(function(acc, r) {
          acc[r.summoner_id] = r.last_season;
          return acc;
        }, {});

        cb(null, r);
      });
    }
  }, function combine(err, res) {
    if(err) {
      return cb(err);
    }

    var finalResult = participants.reduce(function(acc, participant) {
      acc[participant.summonerId] = {
        id: participant.summonerId,
        name: participant.summonerName,
        level: res.level[participant.summonerId],
        tier: res.rank[participant.summonerId] ? res.rank[participant.summonerId].tier : '',
        division: res.rank[participant.summonerId] ? res.rank[participant.summonerId].division : '',
        queue: res.rank[participant.summonerId] ? res.rank[participant.summonerId].queue : '',
        last_season_rank: res.lastSeasonRank[participant.summonerId] || null,
      };

      return acc;
    }, {});

    cb(null, finalResult);
  });
};

