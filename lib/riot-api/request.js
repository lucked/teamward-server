"use strict";

var async = require("async");
var supertest = require("supertest");
var config = require("../../config");
var getFromCacheOrFetch = require("./cache");
var log = require("debug")("teamward:riot-request");

var requestQueue;
// Queue worker, loading endpoints from Riot and returning the body
// This function also handles rate-limiting, retrying after the proper delay.
function queueWorker(task, cb) {
  log("Loading " + task.endpoint + " (" + task.region + ")");
  if(!task.region) {
    throw new Error("Undefined region.");
  }

  // Strategy for fetching when not in cache
  var fetcher = function getFromRiot(cb) {
    supertest("https://" + task.region + ".api.pvp.net")
      .get(task.endpoint + (task.endpoint.indexOf("?") === -1 ? "?" : "&") + "api_key=" + config.apiKey)
      .timeout(2500)
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

        if(err && err.timeout) {
          err = new Error("Issues with the Riot API :( [TIMEOUT]");
        }

        cb(err, res && res.body);
      });
  };

  // Try to read from cache first
  // We already checked in cache once, however we may be in a situation where two players use the app at the same time,
  // and queue multiple requests simultaneously, thus resulting in a cache miss.
  // Also, our internal caching layer is much faster than a real request anyway.
  getFromCacheOrFetch(task.region, task.endpoint, task.cacheable, fetcher, cb);
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

  var fetcher = function getFromRiot(cb) {
    requestQueue.push({
      region: region,
      endpoint: endpoint,
      cacheable: cacheable
    }, cb);
  };
  getFromCacheOrFetch(region, endpoint, cacheable, fetcher, done);
};
