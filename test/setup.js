'use strict';
var nock = require("nock");

var ddragon = require("../lib/ddragon");
var cache = require('../lib/riot-api/cache.js');

// Fake ddragon data for all tests
before(function loadDdragon() {
  ddragon._cache = {
    '/realms/euw.json': require('./mocks/mocks/custom_ddragon_realms_euw.json'),
    '/cdn/7.12.1/data/en_US/champion.json': require('./mocks/mocks/custom_ddragon_champion.json'),
    '/cdn/7.12.1/data/en_US/item.json': require('./mocks/mocks/custom_ddragon_item.json'),
    '/cdn/7.12.1/data/en_US/summoner.json': require('./mocks/mocks/custom_ddragon_summoner.json'),
  };
});


beforeEach(function cleanCaches() {
  // Previous nocks
  nock.cleanAll();
});

beforeEach(function cleanRedisCache(done) {
  cache.connection.eval("local keys = redis.call('keys', ARGV[1]) \n for i=1,#keys,5000 do \n redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) \n end \n return keys", 0, "cache.*", done);
});

