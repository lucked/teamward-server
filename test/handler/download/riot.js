'use strict';
var supertest = require('supertest');

var config = require('../../../config');
var app = require('../../../app');

describe("GET /download/riot.txt", function() {
  it("should return riot.txt file", function(done) {
    supertest(app)
      .get('/download/riot.txt')
      .expect(config.verifyKey)
      .end(done);
  });
});
