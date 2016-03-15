'use strict';

var mongoose = require('mongoose');

var HttpCacheSchema = new mongoose.Schema({
  // An unique string defining the current auth
  endpoint: {
    type: String,
    required: true,
    unique: true,
  },

  body: {
    type: Object,
  },

  // TODO: add a TTL to this record, to ensure we get up to date informations
});

module.exports = mongoose.model("HttpCache", HttpCacheSchema);
