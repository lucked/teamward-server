'use strict';
var mongoose = require("mongoose");
var nock = require("nock");

before(function cleanHttpCaches(done) {
  mongoose.model('HttpCache').remove({}, done);
});

beforeEach(function cleanNick() {
  nock.cleanAll();
});
