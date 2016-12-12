'use strict';

var mongoose = require('mongoose');

var CacheSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: Object,
    required: true,
  },
  expireAt: {
    type: Date,
    required: true
  },
});

// Ensure it is automatically removed by mongod
CacheSchema.index({"expireAt": 1}, {expireAfterSeconds: 0});

module.exports = mongoose.model("Cache", CacheSchema);
