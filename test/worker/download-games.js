"use strict";

var assert = require("assert");
var mongoose = require("mongoose");

var recorder = require('../mocks/recorder');

var downloadGamesWorker = require('../../lib/worker/download-games');

describe("pushNotifier worker", function() {
  beforeEach(function clearDB(done) {
    mongoose.model('Match').remove({}, done);
  });

  it("should download match data and format them properly", function(done) {
    done = recorder.useNock(this, done);

    var job = {
      gameId: 3124412952,
      region: 'euw'
    };
    downloadGamesWorker.workerFunction(job, function(err, game) {
      assert.ifError(err);

      assert.equal(game._id, job.region + ":" + job.gameId);
      assert.equal(game.tier, "BRONZE");
      assert.equal(game.teams[1].players[2].role, "MID");
      done();
    });
  });
});
