'use strict';

var mongoose = require('mongoose');

var ChampionSchema = new mongoose.Schema({
  _id: {
    type: Number,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  name: {
    type: String,
    required: true,
  },
  roles: {
    type: Array,
    required: true,
    index: true,
  },
  patch: String,
  roleData: Object,
  topMatchups: {
    type: Array,
  },
  midMatchups: {
    type: Array,
  },
  jungleMatchups: {
    type: Array,
  },
  botMatchups: {
    type: Array,
  },
  supportMatchups: {
    type: Array,
  },
});

ChampionSchema.methods.getMatchups = function getMatchups(role) {
  return this[role.toLowerCase() + "Matchups"] || [];
};

module.exports = mongoose.model("Champion", ChampionSchema);
