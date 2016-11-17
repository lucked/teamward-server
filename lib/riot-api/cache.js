"use strict";

var fs = require("fs");
var async = require("async");
var glob = require("glob");
var config = require('../../config');
var log = require('debug')('teamward:cache');

var noop = function() {};

var noSlashRegexp = /\//g;
var getCachePath = function getCachePath(region, endpoint) {
  return config.tempPath + "/" + module.exports.cachePrefix + region + "." + endpoint.replace(noSlashRegexp, '-slash-') ;
};


var readJsonFile = function readFile(filePath, cb) {
  fs.readFile(filePath, 'utf8', function(err, wrapperString) {
    if(err) {
      cb(null, null);
      return;
    }

    try {
      cb(null, JSON.parse(wrapperString));
      return;
    }
    catch(e) {
      if(e.toString().indexOf('in JSON') === -1) {
        throw e;
      }

      log("Unable to open JSON file for path " + filePath + "!");
      cb(null, null);
    }
  });
};


var purge = function purge(cb) {
  if(!cb) {
    cb = noop;
  }

  var now = new Date().getTime();

  glob(config.tempPath + "/" + module.exports.cachePrefix + "*", function(err, files) {
    if(err) {
      throw err;
    }

    async.eachLimit(files, 15, function(file, cb) {
      readJsonFile(file, function(err, wrapper) {
        if(err || !wrapper) {
          log("Unable to check file for purging: " + file);
          return cb();
        }

        if(wrapper.e < now) {
          fs.unlink(file, cb);
        }
        else {
          cb();
        }
      });
    }, cb);
  });
};


var hit = 0;
var miss = 0;

module.exports = {
  get: function(region, endpoint, cb) {
    // Try to read from cache,
    // Return cb(null, data) if data is already available in your cache.
    // If it's a cache-miss, you still need to call cb(null, null) for the request to proceed.
    var filePath = getCachePath(region, endpoint);
    readJsonFile(filePath, function(err, wrapper) {
      if(err || !wrapper || !wrapper.c) {
        // File does not exist, hence is not cached
        miss += 1;
        return cb(null, null);
      }

      var now = new Date().getTime();
      var expiry = wrapper.e;

      if(now > expiry) {
        // Stale file
        miss += 1;
        return cb(null, null);
      }
      hit += 1;

      cb(null, wrapper.c);
    });
  },
  set: function(region, endpoint, cacheStrategy, content) {
    // Use this function to store `content`, which is the result of the API call to `endpoint` on `region`.
    var wrapper = {
      e: new Date().getTime() + cacheStrategy,
      c: content
    };

    var filePath = getCachePath(region, endpoint);

    var data = JSON.stringify(wrapper);

    fs.writeFile(filePath, data, noop);
  }
};

// Prefix to append to all files,
// Test will use this to ensure they are atomic and don't reuse another cache
module.exports.cachePrefix = "tw-cache-";
module.exports.getCachePath = getCachePath;
module.exports.purge = purge;


setInterval(function() {
  log("Purging data...");
  purge();
  log("Hit " + hit + ", miss " + miss, (hit / (hit + miss)) + "%");
}, 60000);
