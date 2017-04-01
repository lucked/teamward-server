"use strict";

var assert = require("assert");
var mongoose = require("mongoose");

var recorder = require('../mocks/recorder');

var downloadGamesWorker = require('../../lib/worker/download-games');

describe("pushNotifier worker", function() {
  beforeEach(function clearDB(done) {
    mongoose.model('Match').remove({}, done);
  });
  beforeEach(function clearDB(done) {
    mongoose.model('ApiMatch').remove({}, done);
  });

  it("should download match data and format them properly", function(done) {
    done = recorder.useNock(this, done);

    var job = {
      id: 3124412952,
      region: 'euw'
    };

    downloadGamesWorker.workerFunction(job, function(err, res) {
      assert.ifError(err);
      var match = res[0][0];
      var apiMatch = res[1][0];
      assert.equal(match._id, job.region + ":" + job.id);
      assert.equal(match.tier, "BRONZE");
      assert.equal(match.teams[1].players[2].role, "MID");

      assert.equal(match._id, apiMatch._id);

      done();
    });
  });
});
