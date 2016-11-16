"use strict";
var LRU = require("lru-cache");

var lruCache = LRU({
  max: 4000,
  maxAge: 1000 * 60 * 60
});

var getIdentifier = function(region, endpoint) {
  return region + ":" + endpoint;
};

module.exports = {
  get: function(region, endpoint, cb) {
    // Try to read from cache,
    // Return cb(null, data) if data is already available in your cache.
    // If it's a cache-miss, you still need to call cb(null, null) for the request to proceed.
    cb(null, lruCache.get(getIdentifier(region, endpoint)));
  },
  set: function(region, endpoint, cacheStrategy, data) {
    // Use this function to store `data`, which is the result of the API call to `endpoint` on `region`.
    lruCache.set(getIdentifier(region, endpoint), data, cacheStrategy);
  }
};

// Expose the lruCache object, so that tests can clear it.
module.exports.lruCache = lruCache;
