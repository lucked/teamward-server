'use strict';

// Load environment variables from .env file
var dotenv = require('dotenv');
var https = require("https");

dotenv.config({silent: true});

require('dnscache')({
  "enable": true,
  "ttl": 300,
  "cachesize": 1000
});

require('mongoose').Promise = global.Promise;

https.globalAgent.keepAlive = true;

/* istanbul ignore next */
if(!process.env.RIOT_API_KEY) {
  throw new Error("Please specify RIOT_API_KEY with a valid Riot key.");
}

var currentEnv = process.env.NODE_ENV || 'development';

module.exports = {
  nodeEnv: currentEnv,
  processType: process.env.DYNO || "development",
  apiKey: process.env.RIOT_API_KEY,
  verifyKey: process.env.RIOT_VERIFY_KEY || "N/C",
  mongoUrl: process.env.MONGO_URL || ("mongodb://localhost/" + currentEnv),
  redisUrl: process.env.REDIS_URL || "redis://localhost",
  gcmApiKey: process.env.GCM_API_KEY,
  pushNotifierQueueConcurrency: process.env.PUSH_NOTIFIER_QUEUE_CONCURRENCY || 10,
};
