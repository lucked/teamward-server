"use strict";

var kue = require("kue");
var async = require("async");
var config = require('../config/');


kue.createQueue({
  redis: config.redisUrl
});

kue.Job.range(0, 100000, 'asc', function(err, jobs) {
  async.eachLimit(jobs, 30, function(j, cb) {
    j.remove(cb);
  }, function(err) {
    if(err) {
      throw err;
    }
    console.log("Cleaned redis.");
    process.exit();
  });
});
