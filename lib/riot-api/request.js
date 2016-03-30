"use strict";

var async = require("async");
var mongoose = require("mongoose");
var supertest = require("supertest");
var rarity = require("rarity");
var config = require("../../config");
var log = require("debug")("gss:riot-request");

var requestQueue;
// Queue worker, loading endpoints from Riot and returning the body
// This function also handles rate-limiting, retrying after the proper delay.
function queueWorker(task, cb) {
  log("Loading " + task.endpoint + " (" + task.region + ")");
  if(!task.region) {
    throw new Error("Undefined region.");
  }

  supertest("https://" + task.region + ".api.pvp.net")
    .get(task.endpoint + (task.endpoint.indexOf("?") === -1 ? "?" : "&") + "api_key=" + config.apiKey)
    .end(function(err, res) {
      if((err && res && res.statusCode === 429) || (res && res.body && res.body.status && res.body.status.status_code === 429)) {
        // Rate limited :(
        // We'll retry later.
        var retryAfter = (res.headers['retry-after'] || 2) * 1000;
        log("Rate limited, will retry in " + retryAfter + " (pending requests: " + (requestQueue.length() + 1) + ")");
        setTimeout(function() {
          log("Restarting after rate limit");
          queueWorker(task, cb);
        }, retryAfter);
        return;
      }

      cb(err, res && res.body);
    });
}


// Since Riot rate limiting is pretty intense, we'll do one call at a time
// We use a queue to manage all calls
// However, for ease of use and abstraction, we provide a "high-level" function riotRequest which will handle all the queuing process
// Note though that for this reason, riotRequest can take a long time to process if a lot of queries are already in the queue.
// Cached requests are always guaranteed to reply fast however.
requestQueue = async.queue(queueWorker, 1);

/**
 * Request a resource from Riot API.
 */
module.exports = function riotRequest(region, endpoint, cacheable, done) {
  if(!done) {
    done = cacheable;
    cacheable = false;
  }

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
    function getFromRiot(cb) {
      requestQueue.push({
        region: region,
        endpoint: endpoint
      }, cb);
    },
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
