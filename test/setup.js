'use strict';
var mongoose = require("mongoose");
var nock = require("nock");

var ddragon = require("../lib/ddragon");

before(function cleanHttpCaches(done) {
  mongoose.model('HttpCache').remove({}, done);
});

beforeEach(function cleanNick() {
  ddragon._cache = {};
  nock.cleanAll();
});
