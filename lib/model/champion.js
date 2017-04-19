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
  riotId: {
    type: String,
  },
  roles: {
    type: Array,
    required: true,
  },
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
  tips: [{
    type: String
  }],
  spells: [{
    _id: false,
    name: String,
    description: String,
    cooldown: String,
    image: String
  }],
  passive: {
    _id: false,
    name: String,
    description: String,
    image: String
  }
});

ChampionSchema.methods.getMatchups = function getMatchups(role) {
  return this[role.toLowerCase() + "Matchups"] || [];
};

module.exports = mongoose.model("Champion", ChampionSchema);
