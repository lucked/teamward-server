'use strict';

// Load environment variables from .env file
var dotenv = require('dotenv');
dotenv.load();

if(!process.env.RIOT_API_KEY) {
  throw new Error("Please specify RIOT_API_KEY with a valid Riot key.");
}

module.exports = {
  server: 'euw',
  apiKey: process.env.RIOT_API_KEY
};
