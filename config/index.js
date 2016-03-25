'use strict';

// Load environment variables from .env file
var dotenv = require('dotenv');
dotenv.load();

if(!process.env.RIOT_API_KEY) {
  throw new Error("Please specify RIOT_API_KEY with a valid Riot key.");
}

var currentEnv = process.env.NODE_ENV || 'development';

module.exports = {
  server: 'euw',
  apiKey: process.env.RIOT_API_KEY,
  mongoUrl: process.env.MONGO_URL || ("mongodb://localhost/" + currentEnv)
};
