"use strict";
var async = require("async");
var mongoose = require("mongoose");
var rarity = require("rarity");
var log = require("debug")("teamward:riot-request");


/**
 * Abstract caching strategy.
 * Fetcher is the function to use if the result can't be found in the cache.
 * Takes a cb as parameter, and must return cb(err, res)
 * Res will be cache is cacheable == true.
 */
module.exports = function getFromCacheOrFetch(region, endpoint, cacheable, fetcher, done) {
  async.waterfall([
    function checkCache(cb) {
      if(!cacheable) {
        return cb(null, null);
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
      if(!cacheable) {
        return cb(null, body);
      }

      var HttpCache = mongoose.model("HttpCache");
      var httpCache = new HttpCache({
        region: region,
        endpoint: endpoint,
        body: body
      });

      httpCache.save(function(err) {
        if(err && err.code && err.code === 11000) {
          // Cache already insterted (we made twice the same request in the queue)
          // This can happen since we add queries to the queues after checking if they're in the cache for faster results.
          err = null;
        }
        cb(err, body);
      });
    }
  ], done);
};
