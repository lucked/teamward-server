'use strict';

var mongoose = require('mongoose');

var ApiMatchSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    unique: true,
  },
  // Raw API response
  raw: Object
}, {
  // Disable __v key.
  // We use mongo bulk update operations directly, so we don't need Mongoose here
  versionKey: false
});


module.exports = mongoose.model("ApiMatch", ApiMatchSchema);
