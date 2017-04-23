"use strict";

var assert = require("assert");
var async = require("async");
var mongoose = require("mongoose");

var recorder = require('../mocks/recorder');

var downloadGamesWorker = require('../../lib/worker/download-games');

describe.skip("downloadGames worker", function() {
  var Match; // = mongoose.model('Match');
  beforeEach(function clearDB(done) {
    Match.remove({}, done);
  });

  it("should download match data and format them properly", function(done) {
    done = recorder.useNock(this, done);

    var job = {
      id: 3124412952,
      region: 'euw'
    };

    async.waterfall([
      function download(cb) {
        downloadGamesWorker.workerFunction(job, cb);
      },
      function getFromDb(cb) {
        Match.findById(job.region + ":" + job.id).exec(cb);
      },
      function(match, cb) {
        assert.equal(match.tier, "BRONZE");
        assert.equal(match.teams[1].players[2].role, "MID");

        cb();
      }
    ], done);
  });
});
