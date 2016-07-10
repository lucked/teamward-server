"use strict";
// Stats come from the champion.gg website
// (source is quoted in the app, with a direct link to champion.gg website)

var async = require("async");
var request = require("request");
var mongodumpReader = require("mongodump-reader");
var ddragon = require('../ddragon/index.js');

var log = require('debug')('teamward:champion-stats');

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
            name: ddragonChampion.name,
            roles: champion.roles.map(function(role) {
              return role.role;
            })
          };

          cb(null, r);
        });
      }, cb);
    }],
    storeData: ['formatData', function(cb, res) {
      console.log(res.formatData);
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
