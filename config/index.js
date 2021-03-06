'use strict';

// Load environment variables from .env file
var dotenv = require('dotenv');
dotenv.config({silent: true});

require('dnscache')({
  "enable": true,
  "ttl": 300,
  "cachesize": 1000
});

require('mongoose').Promise = global.Promise;

/* istanbul ignore next */
if(!process.env.RIOT_API_KEY) {
  throw new Error("Please specify RIOT_API_KEY with a valid Riot key.");
}

var currentEnv = process.env.NODE_ENV || 'development';
var riotApiRateLimits = (process.env.RIOT_API_RATE_LIMITS || "10,500").split(",");

module.exports = {
  nodeEnv: currentEnv,
  processType: process.env.DYNO || "development",
  riot: {
    apiKey: process.env.RIOT_API_KEY,
    defaultConcurrency: riotApiRateLimits[0],
    defaultLongConcurrency: riotApiRateLimits[1],
    verifyKey: process.env.RIOT_VERIFY_KEY || "N/C",
  },
  mongoUrl: process.env.MONGO_URL || ("mongodb://localhost/" + currentEnv),
  sqlUrl: process.env.SQL_URL || "postgres://test:test@localhost/teamward-dev",
  redisUrl: process.env.REDIS_URL || "redis://localhost",
  gcmApiKey: process.env.GCM_API_KEY,
  pushNotifierQueueConcurrency: process.env.PUSH_NOTIFIER_QUEUE_CONCURRENCY || 10,
  teamwardUsersOverride: process.env.TEAMWARD_USERS_OVERRIDE ? process.env.TEAMWARD_USERS_OVERRIDE.split(',') : [],
  gameDownloadQueueConcurrency: process.env.GAME_DOWNLOAD_QUEUE_CONCURRENCY || 10,
};
