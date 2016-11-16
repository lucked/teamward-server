"use strict";

var RiotRequest = require("riot-lol-api");
var config = require("../../config");

// When using production key, make call in a faster way
var defaultConcurrency = process.env.RIOT_API_KEY_IS_PRODUCTION ? 3000 : 10;
var defaultLongConcurrency = process.env.RIOT_API_KEY_IS_PRODUCTION ? 180000 : 500;

var rateLimits = [defaultConcurrency, defaultLongConcurrency];
var cache = {
  get: function(region, endpoint, cacheStrategy, cb) {
    cb(null, null);
  },
  set: function(region, endpoint, cacheStrategy, data) {
    // jshint unused:false
    // Do nothing.
  }
};

var riotRequest = new RiotRequest(config.apiKey, rateLimits, cache);

module.exports = riotRequest.request;
