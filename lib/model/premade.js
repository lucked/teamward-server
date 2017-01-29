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
});

module.exports = mongoose.model("Premade", PremadeSchema);
