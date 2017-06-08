"use strict";
// Stats come from the champion.gg website
// (source is quoted in the app, with a direct link to champion.gg website)

var async = require("async");
var newrelic = require("newrelic");
var mongoose = require('mongoose');
var fs = require('fs');
var rarity = require("rarity");

var Champion = mongoose.model('Champion');

var createPool = require('../model/sql/create-pool.js');
var ddragon = require('../ddragon/index.js');
var errorLogger = require('../error-logger.js');

var log = require('debug')('teamward:champion-stats');

function roleName(role) {
  if(role === "CARRY") {
    return "BOT";
  }
  return role;
}

module.exports = newrelic.createBackgroundTransaction('champion-stats:compute', 'tasks', function()  {
  var pool = createPool(3);
  log("Starting champion stats analysis");

  // This worker is always started in its own process, so we can use Sync.
  var lastPatchSql = fs.readFileSync(__dirname + '/../model/sql/queries/matchups/last_patch.sql').toString();
  var laneSql = fs.readFileSync(__dirname + '/../model/sql/queries/matchups/lanes.sql').toString();
  var matchupSql = fs.readFileSync(__dirname + '/../model/sql/queries/matchups/matchups.sql').toString();

  async.auto({
    warmCache: ddragon.getChampionData.bind(this, 'euw', 420),
    queryLastPatch: function queryLastPatch(cb) {
      pool.query(lastPatchSql, [300000], cb);
    },
    lastPatch: ['queryLastPatch', function lastPatch(res, cb) {
      var r = res.queryLastPatch.rows[0];
      log("Last patch with enough games is " + r.season + "." + r.patch);
      cb(null, r);
    }],
    queryChampionByLane: ['lastPatch', function queryChampionByLane(res, cb) {
      pool.query(laneSql, [res.lastPatch.season, res.lastPatch.patch], cb);
    }],
    championByLane: ['queryChampionByLane', function championByLane(res, cb) {
      log("Found " + res.queryChampionByLane.rows.length + " champions/lanes combinaisons");
      cb(null, res.queryChampionByLane.rows);
    }],
    queryMatchups: ['championByLane', 'lastPatch', function queryMatchups(res, cb) {
      pool.query(matchupSql, [res.lastPatch.season, res.lastPatch.patch], cb);
    }],
    matchups: ['queryMatchups', function matchups(res, cb) {
      log("Found " + res.queryMatchups.rows.length + " matchups");
      cb(null, res.queryMatchups.rows);
    }],
    formatLanes: ['warmCache', 'championByLane', function(res, cb) {
      async.reduce(res.championByLane, {}, function(champions, champion, cb) {
        ddragon.getChampionData('euw', champion.champion_id, function(err, ddragonChampion) {
          if(err) {
            return cb(err);
          }

          if(!champions[champion.champion_id]) {
            champions[champion.champion_id] = {
              _id: ddragonChampion.key,
              id: ddragonChampion.id,
              name: ddragonChampion.name,
              roles: [],
              patch: res.lastPatch.season + "." + res.lastPatch.patch,
              roleData: {},
            };
          }
          champions[champion.champion_id].roles.push(roleName(champion.role));
          champions[champion.champion_id].roleData[roleName(champion.role)] = {
            winrate: parseFloat(champion.winrate),
            gamesCount: parseInt(champion.nb_games_in_role),
            percentPlayInRole: parseFloat(champion.percent_play_in_role)
          };

          cb(null, champions);
        });
      }, cb);
    }],
    formatMatchups: ['formatLanes', 'matchups', function(res, cb) {
      var champions = res.formatLanes;
      async.each(res.matchups, function(matchup, cb) {
        ddragon.getChampionData('euw', matchup.champion2_id, function(err, ddragonChampion) {
          if(err) {
            return cb(err);
          }

          var key = roleName(matchup.role).toLowerCase() + "Matchups";
          champions[matchup.champion1_id][key] = champions[matchup.champion1_id][key] || [];
          champions[matchup.champion1_id][key].push({
            games: parseInt(matchup.nb_games),
            id: matchup.champion2_id,
            name: ddragonChampion.name,
            winRate: parseFloat(matchup.winrate)
          });

          cb();
        });
      }, rarity.carry([champions], cb));
    }],
    storeData: ['formatMatchups', function(res, cb) {
      log("Updating database...");

      var matchups = Object.keys(res.formatMatchups).map(id => res.formatMatchups[id]);

      async.eachLimit(matchups, 5, function(champion, cb) {
        var championId = champion._id;
        champion.updatedAt = new Date();
        // Delete the _id property, otherwise Mongo will return a "Mod on _id not allowed" error
        delete champion._id;

        // Do the upsert, which works like this: if no champion document exists with
        // _id = championId, then create a new doc using upsertData.
        // Otherwise, update the existing doc with upsertData
        Champion.update({_id: championId}, champion, {upsert: true}, cb);
      }, cb);
    }]
  }, function(err) {
      if(err) {
        errorLogger(err, {log: log});
      }
      else {
        log("Champion stats successfully updated");
      }
      newrelic.endTransaction();


      // Disconnect from mongoose. This should shutdown everything properly once all requests are sent.
      mongoose.disconnect();
      pool.end();

      setTimeout(function() {
        log("Forcing worker shut down.");
        process.exit(0);
      }, 2500).unref();
    });
});
