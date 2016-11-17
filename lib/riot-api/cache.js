"use strict";

var fs = require("fs");
var config = require('../../config');
var log = require('debug')('teamward:cache');

var noop = function() {};

var noSlashRegexp = /\//g;
var getCachePath = function(region, endpoint) {
  return config.tempPath + "/" + module.exports.cachePrefix + region + "." + endpoint.replace(noSlashRegexp, '-slash-') ;
};

var hit = 0;
var miss = 0;

module.exports = {
  get: function(region, endpoint, cb) {
    // Try to read from cache,
    // Return cb(null, data) if data is already available in your cache.
    // If it's a cache-miss, you still need to call cb(null, null) for the request to proceed.
    var filePath = getCachePath(region, endpoint);
    fs.readFile(filePath, 'utf8', function(err, wrapperString) {
      if(err) {
        // File does not exist, hence is not cache
        miss += 1;
        return cb(null, null);
      }

      var wrapper = JSON.parse(wrapperString);
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
module.exports.cachePrefix = "";

setInterval(function() {
  // lruCache.purge();
  log("Hit " + hit + ", miss " + miss, (hit / (hit + miss)) + "%");
}, 5000);
