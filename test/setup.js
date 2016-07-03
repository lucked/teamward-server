'use strict';
var mongoose = require("mongoose");
var nock = require("nock");

before(function(done) {
  mongoose.model('HttpCache').remove({}, done);
});

beforeEach(function() {
  nock.cleanAll();
});
