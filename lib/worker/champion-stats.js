"use strict";
// Stats come from the champion.gg website
// (source is quoted in the app, with a direct link to champion.gg website)

var async = require("async");
var newrelic = require("newrelic");
var request = require("request");
var mongodumpReader = require("mongodump-reader");
var mongoose = require('mongoose');
var rarity = require("rarity");

var Champion = mongoose.model('Champion');

var ddragon = require('../ddragon/index.js');
var errorLogger = require('../error-logger.js');

var log = require('debug')('teamward:champion-stats');


// Tools to translate roles name
var ggRoleObject = {
  "MIDDLE": "MID",
  "DUO_CARRY": "BOT",
  "DUO_SUPPORT": "SUPPORT"
};
function ggRoleToTeamwardRole(ggRole) {
  return ggRoleObject[ggRole] || ggRole;
}


// Tool to download and read a bson file
function downloadBson(url, cb) {
  log("Downloading " + url);
  async.waterfall([
    function downloadStats(cb) {
      // Stats come from the champion.gg website
      // (source is quoted in the app, with a direct link to champion.gg website)

      var requestSettings = {
        method: 'GET',
        url: url,
        encoding: null
      };
      request(requestSettings, function(err, res, body) {
        cb(err, new Buffer(body || '', 'hex'));
      });
    },
    function parseStats(buffer, cb) {
      mongodumpReader(buffer, cb);
    }], cb);
}

var formatChampion = function(champion, allMatchupData, cb) {
  async.waterfall([
    function getChampionData(cb) {
      ddragon.getChampionData('euw', champion.key, cb);
    },
    function getSpecificChampionData(ddragonChampion, cb) {
      ddragon.getDetailedChampionData('euw', ddragonChampion.id, cb);
    },
    function(ddragonChampion, cb) {
      var r = {
        _id: ddragonChampion.key,
        riotId: ddragonChampion.id,
        name: ddragonChampion.name,
        tips: ddragonChampion.enemytips,
        spells: ddragonChampion.spells.map((spell) => {
          return {
            name: spell.name,
            description: spell.description,
            cooldown: spell.cooldownBurn
          };
        }),
        passive: {
          name: ddragonChampion.passive.name,
          description: ddragonChampion.passive.description,
        },
        roles: champion.roles.map((role) => ggRoleToTeamwardRole(role.role))
      };

      async.each(r.roles, function(role, cb) {
        var matchupData = allMatchupData.find(function(champion) {
          return champion.key === r.riotId && ggRoleToTeamwardRole(champion.role) === role;
        });

        if(matchupData) {
          var key = role.toLowerCase() + "Matchups";
          // Filter to only get matchup with more than 100 games
          r[key] = matchupData.matchups.filter(function(matchup) {
            return matchup.games >= 100;
          });

          async.each(r[key], function(matchup, cb) {
            ddragon.getChampionData('euw', matchup.key, function(err, ddragonChampion) {
              if(err) {
                return cb(err);
              }

              matchup.id = ddragonChampion.key;
              matchup.name = ddragonChampion.name;

              // And cleanup what's saved in DB
              delete matchup.key;
              delete matchup.statScore;
              delete matchup.winRateChange;
              delete matchup._id;
              cb();
            });
          }, cb);
        }
        else {
          cb();
        }

      }, rarity.carry(r, cb));
    }
  ], cb);
};

module.exports = newrelic.createBackgroundTransaction('champion-stats:crawler', 'workers', function()  {
  log("Starting champion stats crawler");

  async.auto({
    warmCache: ddragon.getChampionData.bind(this, 'euw', 420),
    downloadRoles: function downloadStats(cb) {
      downloadBson('https://raw.githubusercontent.com/joel1st/championweb/master/db/championgg/webchampionroles.bson', cb);
    },
    downloadMatchup: function downloadStats(cb) {
      downloadBson('https://raw.githubusercontent.com/joel1st/championweb/master/db/championgg/webchampionpages.bson', cb);
    },
    formatData: ['warmCache', 'downloadRoles', 'downloadMatchup', function(res, cb) {
      async.map(res.downloadRoles, function(champion, cb) {
        formatChampion(champion, res.downloadMatchup, cb);
      }, cb);
    }],
    storeData: ['formatData', function(res, cb) {
      log("Updating database...");

      async.eachLimit(res.formatData, 5, function(champion, cb) {
        var championId = champion._id;
        champion.updatedAt = new Date();
        // Delete the _id property, otherwise Mongo will return a "Mod on _id not allowed" error
        delete champion._id;

        // Do the upsert, which works like this: If no champion document exists with
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

      setTimeout(function() {
        log("Forcing worker shut down.");
        process.exit(0);
      }, 2500).unref();
    });
});
