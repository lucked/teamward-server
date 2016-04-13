'use strict';
var supertest = require('supertest');
var app = require('../../app');

describe("GET /download", function() {
  it("should redirect to the play store", function(done) {
    supertest(app)
      .get('/download')
      .expect(302)
      .expect('location', /play\.google/i)
      .end(done);
  });
});
