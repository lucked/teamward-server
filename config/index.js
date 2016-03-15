'use strict';

// Load environment variables from .env file
var dotenv = require('dotenv');
dotenv.load();

if(!process.env.API_KEY) {
  throw new Error("Please specify API_KEY with a valid Riot key.");
}

module.exports = {
  server: 'euw',
  apiKey: process.env.API_KEY
};
