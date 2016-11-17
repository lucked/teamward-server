'use strict';
var nock = require("nock");

var ddragon = require("../lib/ddragon");
var cache = require('../lib/riot-api/cache');


beforeEach(function cleanCaches() {
  // API cache
  cache.cachePrefix = "tw-tests-" + new Date().getTime();

  // DDragon cache
  ddragon._cache = {};

  // Previous nocks
  nock.cleanAll();
});
