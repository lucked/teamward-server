'use strict';
var nock = require("nock");

var ddragon = require("../lib/ddragon");
var cache = require('../lib/riot-api/cache.js');

beforeEach(function cleanCaches() {
  // DDragon cache
  ddragon._cache = {};

  // Previous nocks
  nock.cleanAll();
});

beforeEach(function cleanRedisCache(done) {
  cache.connection.eval("local keys = redis.call('keys', ARGV[1]) \n for i=1,#keys,5000 do \n redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) \n end \n return keys", 0, "cache.*", done);
});
