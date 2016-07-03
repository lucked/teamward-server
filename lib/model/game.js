'use strict';

var mongoose = require('mongoose');

var GameSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now
  },
  gameId: {
    type: Number,
    required: true,
    unique: true
  },
  region: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: true,
  },
  winner: {
    type: String,
    default: "none"
  }
}, {
  // Make it a capped collection
  capped: {
    size: 1024 * 1024 * 400,
    max: 2048,
    autoIndexId: true
  }
});

module.exports = mongoose.model("Game", GameSchema);