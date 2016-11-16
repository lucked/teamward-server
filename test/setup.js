'use strict';
var mongoose = require("mongoose");
var nock = require("nock");

var ddragon = require("../lib/ddragon");
var cache = require('../lib/riot-api/cache');


before(function cleanHttpCaches(done) {
  mongoose.model('HttpCache').remove({}, done);
});

beforeEach(function cleanLocalCache() {
  cache.lruCache.reset();
});

beforeEach(function cleanNock() {
  ddragon._cache = {};
  nock.cleanAll();
});
