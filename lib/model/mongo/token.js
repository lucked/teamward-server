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
  summonerId: {
    type: Number,
    required: true,
  },
  summonerProfileId: {
    type: Number,
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
  },
  inGame: {
    type: Boolean,
    default: false
  }
});

TokenSchema.index({"region": 1, "summonerId": 1}, {unique: true});

module.exports = mongoose.model("Token", TokenSchema);
