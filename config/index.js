'use strict';

// Load environment variables from .env file
var dotenv = require('dotenv');
dotenv.load();

require('dnscache')({
  "enable": true,
  "ttl": 300,
  "cachesize": 1000
});

require('mongoose').Promise = global.Promise;

if(!process.env.RIOT_API_KEY) {
  throw new Error("Please specify RIOT_API_KEY with a valid Riot key.");
}

var currentEnv = process.env.NODE_ENV || 'development';

module.exports = {
  apiKey: process.env.RIOT_API_KEY,
  verifyKey: process.env.RIOT_VERIFY_KEY || "N/C",
  mongoUrl: process.env.MONGO_URL || ("mongodb://localhost/" + currentEnv)
};
