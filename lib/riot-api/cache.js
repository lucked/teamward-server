"use strict";

var redis = require("redis");
var log = require('debug')('teamward:cache');
var config = require('../../config/');

var connection = redis.createClient(config.redisUrl);

var noop = function() {};

var getCacheKey = function getCacheKey(region, endpoint) {
  return "cache." + region + ":" + endpoint;
};


module.exports = {
  get: function(region, endpoint, cb) {
    // Try to read from cache,
    // Return cb(null, data) if data is already available in your cache.
    // If it's a cache-miss, you still need to call cb(null, null) for the request to proceed.
    connection.get(getCacheKey(region, endpoint), function(err, cache) {
      if(err) {
        log("Got an error while reading cache for " + getCacheKey(region, endpoint), err);
        cb(null, null);
        return;
      }

      cb(null, JSON.parse(cache));
    });
  },
  set: function(region, endpoint, cacheStrategy, content, cb) {
    if(!cb) {
      cb = noop;
    }

    var key = getCacheKey(region, endpoint);
    connection.multi()
      .set(key, JSON.stringify(content))
      .expire(key, cacheStrategy)
      .exec(cb);
  }
};

module.exports.connection = connection;
