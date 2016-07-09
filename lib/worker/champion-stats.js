"use strict";

var fs = require("fs");
var async = require("async");
var bsonize = require("bsonize");
var bson = require('bson').BSONPure.BSON;

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

      while(true) {
        var data = bsonize.deserialize(buffer);
        console.log(data);
        var objectSize = bson.calculateObjectSize(data);
        buffer = buffer.slice(objectSize);
        console.log(buffer.length);
      }


      console.log(data);
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
