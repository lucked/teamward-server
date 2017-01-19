"use strict";

var kue = require("kue");
var async = require("async");
var config = require('../config/');


kue.createQueue({
  jobEvents: false, // Do not send individual job events (useful for our case with many small tasks)
  redis: config.redisUrl
});

kue.Job.range(0, 100000, 'asc', function(err, jobs) {
  async.eachLimit(jobs, 30, function(j, cb) {
    j.remove(cb);
  }, function() {
    console.log("Cleaned redis.");
    process.exit();
  });
});
