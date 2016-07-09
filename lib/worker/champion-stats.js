"use strict";

var fs = require("fs");
var async = require("async");
var mongodumpReader = require("mongodump-reader");

var supertest = require("supertest");

var log = require('debug')('teamward:champion-stats');

module.exports = function(opbeat)  {
  log("Starting champion stats crawler");

  async.waterfall([
    function downloadStats(cb) {
      // Stats come from the champion.gg website
      // (source is quoted in the app, with a direct link to champion.gg website)

      var output = fs.createWriteStream('/tmp/bson');

      cb();
      // supertest("https://raw.githubusercontent.com")
      //   .get("/joel1st/championweb/master/db/championgg/webchampionroles.bson")
      //   .expect(200)
      //   .pipe(output)
      //   .on('end', cb);
    },
    function parseStats(res, cb) {
      var buffer = fs.readFileSync('/home/neamar/Downloads/webchampionroles.bson');

      mongodumpReader(buffer, function() {
        console.log(arguments);
      });
    }], function(err) {
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
