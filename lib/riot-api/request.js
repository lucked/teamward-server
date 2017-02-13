"use strict";

var RiotRequest = require("riot-lol-api");
var config = require("../../config");
var cache = require('./cache');

// When using production key, make call in a faster way
var defaultConcurrency = process.env.RIOT_API_KEY_IS_PRODUCTION ? 3000 : 10;
var defaultLongConcurrency = process.env.RIOT_API_KEY_IS_PRODUCTION ? 180000 : 500;

var rateLimits = [defaultConcurrency, defaultLongConcurrency];

var riotRequest = new RiotRequest(config.apiKey, rateLimits, cache);

module.exports = riotRequest.request.bind(riotRequest);
module.exports.getPlatformFromRegion = riotRequest.getPlatformFromRegion.bind(riotRequest);
