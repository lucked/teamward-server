'use strict';
var nock = require("nock");
var fs = require("fs");
var async = require("async");

var config = require('../config/');
var ddragon = require("../lib/ddragon");
var cache = require('../lib/riot-api/cache.js');
var getPool = require('../lib/model/sql/create-pool.js');

var pool = getPool(1);

// Fake ddragon data for all tests, only once
before(function loadDdragon() {
  ddragon._cache = {
    '/realms/euw.json': require('./mocks/mocks/custom_ddragon_realms_euw.json'),
    '/cdn/7.12.1/data/en_US/champion.json': require('./mocks/mocks/custom_ddragon_champion.json'),
    '/cdn/7.12.1/data/en_US/item.json': require('./mocks/mocks/custom_ddragon_item.json'),
    '/cdn/7.12.1/data/en_US/summoner.json': require('./mocks/mocks/custom_ddragon_summoner.json'),
  };
});

// Create Postgres tables, only once
before(function initializeDatabase(done) {
  if(config.sqlUrl.indexOf('localhost') === -1) {
    throw new Error("Refusing to drop a non localhost database.");
  }

  var fixtures = fs.readFileSync(__dirname + '/../lib/model/sql/queries/fixtures.sql').toString();

  async.eachLimit(fixtures.split(";"), 1, function(query, cb) {
    pool.query(query, cb);
  }, done);
});

beforeEach(function cleanCaches() {
  // Previous nocks
  nock.cleanAll();
});

beforeEach(function cleanRedisCache(done) {
  cache.connection.eval("local keys = redis.call('keys', ARGV[1]) \n for i=1,#keys,5000 do \n redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) \n end \n return keys", 0, "cache.*", done);
});

module.exports.dbPool = pool;
module.exports.truncateDatabase = function(done) {
  pool.query('TRUNCATE TABLE matches CASCADE', done);
};
