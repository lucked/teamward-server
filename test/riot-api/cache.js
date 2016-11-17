"use strict";

var async = require("async");
var assert = require("assert");
var fs = require("fs");

var cache = require('../../lib/riot-api/cache');


describe("Network cache", function() {
  it("should retrieve data once cached", function(done) {
    async.waterfall([
      function set(cb) {
        cache.set('euw', '/test', 10000, 'test');
        // We need to wait for the write to succeed on disk
        setTimeout(cb, 15);
      },
      function get(cb) {
        cache.get('euw', '/test', cb);
      },
      function compare(data, cb) {
        assert.equal(data, 'test');

        cb();
      }], done);
  });

  it("should not return outdated content", function(done) {
    async.waterfall([
      function set(cb) {
        cache.set('euw', '/old', 0, 'nope');
        // We need to wait for the write to succeed on disk
        setTimeout(cb, 15);
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

  it("should be able to purge its content on disk", function(done) {
    async.waterfall([
      function set(cb) {
        cache.set('euw', '/old', 0, 'nope');
        cache.set('euw', '/new', 10000, 'test');
        // We need to wait for the write to succeed on disk
        setTimeout(cb, 15);
      },
      function sanityCheck(cb) {
        assert.ok(fs.readFileSync(cache.getCachePath('euw', '/old')).indexOf('nope') !== -1);
        assert.ok(fs.readFileSync(cache.getCachePath('euw', '/new')).indexOf('test') !== -1);
        cb();
      },
      function purge(cb) {
        cache.purge(cb);
      },
      function ensureRemoved(cb) {
        // Should be removed
        assert.throws(function() {
          fs.readFileSync(cache.getCachePath('euw', '/old'));
        });

        // Should still exist
        assert.ok(fs.readFileSync(cache.getCachePath('euw', '/new')).indexOf('test') !== -1);
        cb();
      }], done);
  });
});
