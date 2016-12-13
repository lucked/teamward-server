'use strict';
var nock = require("nock");

var mongoose = require("mongoose");
var ddragon = require("../lib/ddragon");


beforeEach(function cleanCaches() {
  // DDragon cache
  ddragon._cache = {};

  // Previous nocks
  nock.cleanAll();
});

beforeEach(function cleanMongoCache(done) {
  mongoose.model('Cache').remove({}, done);
});
