"use strict";
var async = require("async");
var mongoose = require("mongoose");
var rarity = require("rarity");
var LRU = require("lru-cache");
var log = require("debug")("teamward:riot-request");

var lruCache = LRU({
  max: 400,
  maxAge: 1000 * 60 * 60
});

var noop = function() {};


/**
 * Abstract caching strategy.
 * Fetcher is the function to use if the result can't be found in the cache.
 * Takes a cb as parameter, and must return cb(err, res)
 * Res will be cache is cacheable == true.
 */
module.exports = function getFromCacheOrFetch(region, endpoint, cacheable, fetcher, done) {
  async.waterfall([
    function checkCache(cb) {
      if(!cacheable || module.exports.disableCaching) {
        return cb(null, null);
      }

      var localCache = lruCache.get(region + endpoint);

      if(localCache) {
        log("Fetch from local cache " + endpoint);
        return done(null, localCache);
      }

      // Read cache, looking for previous call to same endpoint
      mongoose.model("HttpCache").findOne({region: region, endpoint: endpoint}, rarity.slice(2, cb));
    },
    function readCache(cacheResult, cb) {
      if(cacheResult) {
        // No need to call Riot on this one
        log("Fetch from cache " + endpoint);
        return done(null, cacheResult.body);
      }

      cb();
    },
    fetcher,
    function writeToCache(body, cb) {
      if(!cacheable || module.exports.disableCaching) {
        return cb(null, body);
      }

      lruCache.set(region + endpoint, body);

      var HttpCache = mongoose.model("HttpCache");
      var httpCache = new HttpCache({
        region: region,
        endpoint: endpoint,
        body: body
      });

      // Save async.
      httpCache.save(noop);

      cb(null, body);
    }
  ], done);
};


module.exports.lruCache = lruCache;
module.exports.disableCaching = false;
