"use strict";
var async = require("async");
var summonerInfoApi = require('../../riot-api/summoner-info-v3.js');

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
    rank: function(cb) {
      async.reduce(participants, {}, function(acc, p, cb) {
        summonerInfoApi.getCurrentRank(p.summonerId, region, function(err, data) {
          if(err) {
            return cb(err);
          }
          var queues = Object.keys(data);
          if(queues.length === 0) {
            return cb(null, acc);
          }

          var mainQueue = data[queues[0]];
          acc[p.summonerId] = {
            tier: mainQueue.tier,
            division: mainQueue.rank,
            queue: queues[0],
          };

          cb(null, acc);
        });
      }, cb);
    },
    level: function(cb) {
      async.reduce(participants, {}, function(acc, p, cb) {
        // If we know for sure player is level 30, don't do anything.
        if(assumedLevels[p.summonerId] === 30) {
          acc[p.summonerId] = 30;
          return cb(null, acc);
        }

        // Otherwise, load information
        summonerInfoApi.getSummonerData(p.summonerName, region, function(err, data) {
          if(err) {
            return cb(err);
          }

          acc[p.summonerId] = data.summonerLevel;

          cb(null, acc);
        });
      }, cb);
    },
    lastSeasonRank: function(cb) {
      // TODO
      cb(null, {});
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
        last_season_rank: res.lastSeasonRank[participant.summonerId],
      };

      return acc;
    }, {});

    cb(null, finalResult);
  });
};

