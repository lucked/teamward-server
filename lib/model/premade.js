'use strict';

var mongoose = require('mongoose');

var PremadeSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  premades: {
    type: Array,
    required: true,
  },
}, {
  // Disable __v key.
  // We use mongo bulk update operations directly, so we don't need Mongoose here
  versionKey: false
});

module.exports = mongoose.model("Premade", PremadeSchema);
