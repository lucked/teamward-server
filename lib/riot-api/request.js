"use strict";

var RiotRequest = require("riot-lol-api");
var config = require("../../config");
var cache = require('./cache');

var rateLimits = [config.riot.defaultConcurrency, config.riot.defaultLongConcurrency];

var riotRequest = new RiotRequest(config.riot.apiKey, rateLimits, cache);

module.exports = riotRequest.request.bind(riotRequest);
module.exports.getPlatformFromRegion = riotRequest.getPlatformFromRegion.bind(riotRequest);
