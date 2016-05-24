"use strict";

var getFromCacheOrFetch = require('../../lib/riot-api/cache.js');


describe("getFromCacheOrFetch()", function() {
  it("should call fetcher for uncacheable request", function(cb) {
    var wasCalled = false;
    getFromCacheOrFetch("test", "notcacheable", false, function(cb) {
      wasCalled = true;
      cb(null, {});
    }, function() {
      if(wasCalled) {
        cb();
      }
      throw new Error("Fetcher was not called");
    });
  });

  it("should call fetcher again for uncacheable request", function(cb) {
    var wasCalled = false;
    getFromCacheOrFetch("test", "notcacheable", false, function(cb) {
      wasCalled = true;
      cb(null, {});
    }, function() {
      if(wasCalled) {
        cb();
      }
      throw new Error("Fetcher was not called");
    });
  });

  it("should call fetcher when data not in cache", function(cb) {
    var wasCalled = false;
    getFromCacheOrFetch("test", "cacheable", true, function(cb) {
      wasCalled = true;
      cb(null, {});
    }, function() {
      if(wasCalled) {
        cb();
      }
      throw new Error("Fetcher was not called");
    });
  });


  it("should not call fetcher when data is already in cache", function(cb) {
    getFromCacheOrFetch("test", "cacheable", true, function(cb) {
      cb(new Error("Fetcher was called"));
    }, cb);
  });
});
