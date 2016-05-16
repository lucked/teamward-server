'use strict';

var mongoose = require('mongoose');

var TokenSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now
  },
  region: {
    type: String,
    required: true,
  },
  summonerName: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    unique: true,
    required: true,
  },
  lastKnownGameId: {
    type: Number
  },
  lastKnownGameDate: {
    type: Date
  }
});

module.exports = mongoose.model("Token", TokenSchema);
