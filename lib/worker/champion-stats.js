"use strict";
// Stats come from the champion.gg website
// (source is quoted in the app, with a direct link to champion.gg website)

var async = require("async");
var request = require("request");
var mongodumpReader = require("mongodump-reader");
var mongoose = require('mongoose');
var rarity = require("rarity");

// Ensure models are initialized
require('../../app.js');
var Champion = mongoose.model('Champion');

var ddragon = require('../ddragon/index.js');

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
        cb(err, new Buffer(body, 'hex'));
      });
    },
    function parseStats(buffer, cb) {
      mongodumpReader(buffer, cb);
    }], cb);
}

module.exports = function(opbeat)  {
  log("Starting champion stats crawler");

  async.auto({
    warmCache: ddragon.getChampionData.bind(this, 'euw', 420),
    downloadRoles: function downloadStats(cb) {
      downloadBson('https://raw.githubusercontent.com/joel1st/championweb/master/db/championgg/webchampionroles.bson', cb);
    },
    downloadMatchup: function downloadStats(cb) {
      downloadBson('https://raw.githubusercontent.com/joel1st/championweb/master/db/championgg/webchampionpages.bson', cb);
    },
    formatData: ['downloadRoles', 'downloadMatchup', function(cb, res) {
      async.map(res.downloadRoles, function(champion, cb) {
        ddragon.getChampionData('euw', champion.key, function(err, ddragonChampion) {
          if(err) {
            return cb(err);
          }

          var r = {
            _id: ddragonChampion.key,
            id: ddragonChampion.id,
            name: ddragonChampion.name,
            roles: champion.roles.map(function(role) {
              return ggRoleToTeamwardRole(role.role);
            })
          };

          async.each(r.roles, function(role, cb) {
            var matchupData = res.downloadMatchup.find(function(champion) {
              return champion.key === r.id && ggRoleToTeamwardRole(champion.role) === role;
            });

            if(matchupData) {
              var key = role.toLowerCase() + "Matchups";
              // Filter to get matchup with more than 100 games
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
        });
      }, cb);
    }],
    storeData: ['formatData', function(cb, res) {
      log("Updating database...");

      async.eachLimit(res.formatData, 5, function(champion, cb) {
        var championId = champion._id;
        champion.updatedAt = new Date();
        // Delete the _id property, otherwise Mongo will return a "Mod on _id not allowed" error
        delete champion._id;

        // Do the upsert, which works like this: If no Contact document exists with
        // _id = contact.id, then create a new doc using upsertData.
        // Otherwise, update the existing doc with upsertData
        Champion.update({_id: championId}, champion, {upsert: true}, cb);
      }, cb);
    }]
  }, function(err) {
      if(err) {
        console.warn(err);
        if(opbeat) {
          opbeat.captureError(err);
        }
      }
      else {
        log("Champion stats successfully updated");
      }
    });
};
