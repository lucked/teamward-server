"use strict";

var rarity = require("rarity");
var async = require("async");
var assert = require("assert");

var cache = require('../../lib/riot-api/cache');


describe("Network cache", function() {
  it("should retrieve data once cached", function(done) {
    async.waterfall([
      function set(cb) {
        cache.set('euw', '/test', 10000, {foo: "bar"}, rarity.slice(1, cb));
      },
      function get(cb) {
        cache.get('euw', '/test', cb);
      },
      function compare(data, cb) {
        assert.deepEqual(data, {foo: "bar"});

        cb();
      }], done);
  });

  // Skipped for now: mongo removal of old documents is slow :(
  it.skip("should not return outdated content", function(done) {
    async.waterfall([
      function set(cb) {
        cache.set('euw', '/old', -1000, {foo: 'nope'}, rarity.slice(1, cb));
      },
      function getOld(cb) {
        cache.get('euw', '/old', cb);
      },
      function compareOld(data, cb) {
        // Data should be null (purged)
        assert.equal(data, null);
        cb();
      }], done);
  });
});
