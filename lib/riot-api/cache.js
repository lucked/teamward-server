"use strict";

var mongoose = require("mongoose");
var log = require('debug')('teamward:cache');

var noop = function() {};

var getCacheKey = function getCacheKey(region, endpoint) {
  return region + ":" + endpoint;
};


module.exports = {
  get: function(region, endpoint, cb) {
    // Try to read from cache,
    // Return cb(null, data) if data is already available in your cache.
    // If it's a cache-miss, you still need to call cb(null, null) for the request to proceed.
    mongoose.model("Cache").findById(getCacheKey(region, endpoint), 'value', {lean: true}, function(err, cache) {
      if(err) {
        log("Got an error while reading cache for " + getCacheKey(region, endpoint), err);
        cb(null, null);
        return;
      }

      cb(null, cache && cache.value);
    });
  },
  set: function(region, endpoint, cacheStrategy, content, cb) {
    if(!cb) {
      cb = noop;
    }
    // Use this function to store `content`, which is the result of the API call to `endpoint` on `region`.
    var Cache = mongoose.model("Cache");
    var cache = new Cache();
    cache._id = getCacheKey(region, endpoint);
    cache.value = content;
    cache.expireAt = new Date(new Date().getTime() + cacheStrategy);
    cache.save(cb);
  }
};
