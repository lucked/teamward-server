'use strict';

var mongoose = require('mongoose');

var HttpCacheSchema = new mongoose.Schema({
  // TTL for this document: one hour.
  createdAt: {
    type: Date,
    expires: 3600,
    default: Date.now
  },
  region: {
    type: String,
    required: true,
  },
  // An unique string defining the current auth
  endpoint: {
    type: String,
    required: true,
  },

  body: {
    type: Object,
  },
});
HttpCacheSchema.index({region: 1, endpoint: 1}, {unique: true});

module.exports = mongoose.model("HttpCache", HttpCacheSchema);
