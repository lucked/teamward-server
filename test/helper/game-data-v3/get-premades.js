"use strict";

var assert = require("assert");
var async = require("async");
var rarity = require("rarity");
var mongoose = require("mongoose");

var getPremades = require('../../../lib/helper/game-data-v3/get-premades.js');

describe.only("getPremades()", function() {
  var Premade = mongoose.model("Premade");
  beforeEach(function(done) {
    Premade.remove({}, done);
  });

  it("should return premades from Mongo database", function(done) {
    async.waterfall([
      function insertFakePremade(cb) {
        var premade = new Premade();
        premade._id = "euw:1";
        premade.premades = [2];
        premade.save(rarity.slice(1, cb));
      },
      function compute(cb) {
        getPremades([
          {summonerId: 1, teamId: 100},
          {summonerId: 2, teamId: 100},
          {summonerId: 3, teamId: 100},
        ], 'euw', cb);
      },
      function validateValues(res, cb) {
        assert.deepEqual(res[100], [[1, 2], [3]]);
        cb();
      }
    ], done);
  });
});
