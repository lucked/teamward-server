"use strict";

var fs = require("fs");
var https = require("https");
var async = require("async");
var request = require("request");
var mongodumpReader = require("mongodump-reader");


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
    downloadRoles: function downloadStats(cb) {
      // Stats come from the champion.gg website
      // (source is quoted in the app, with a direct link to champion.gg website)
      downloadBson('https://raw.githubusercontent.com/joel1st/championweb/master/db/championgg/webchampionroles.bson', cb);
    },
    downloadMatchup: function downloadStats(cb) {
      // Stats come from the champion.gg website
      // (source is quoted in the app, with a direct link to champion.gg website)
      downloadBson('https://raw.githubusercontent.com/joel1st/championweb/master/db/championgg/webchampionpages.bson', cb);
    },
    debug: ['downloadRoles', 'downloadMatchup', function(cb, res) {
      console.log(res.downloadRoles);
      fs.writeFileSync("/tmp/matchups.json",JSON.stringify(res.downloadMatchup, null, 2));
      cb();
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
