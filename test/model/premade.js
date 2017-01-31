"use strict";

var async = require("async");
var assert = require('assert');
var mongoose = require("mongoose");

describe("Premade model", function() {
  var Premade = mongoose.model('Premade');
  beforeEach(function(done) {
    Premade.remove({}, done);
  });

  describe("Premade.loadKnownPremadesFromDB()", function() {
    it("should do nothing on an empty DB", function(done) {
      Premade.loadKnownPremadesFromDB([1, 2, 3], "euw", function(err, res) {
        assert.ifError(err);

        assert.deepEqual(res, {});
        done();
      });
    });

    it("should return summoner ids in an easy to use object", function(done) {
      async.waterfall([
        function createPremade(done) {
          var premade = new Premade();
          premade._id = "euw:1";
          premade.premades = [2, 3];
          premade.save(done);
        },
        function retrievePremades(premade, count, cb) {
          Premade.loadKnownPremadesFromDB([1,2], "euw", cb);
        },
        function ensureCorrectness(premades, cb) {
          assert.deepEqual(premades, {1: [2, 3]});
          cb();
        }
      ], done);
    });
  });

  describe("Premade.savePremadesToDB()", function() {
    it("should create new records for unknowns premades", function(done) {
      async.waterfall([
        function save(cb) {
          Premade.savePremadesToDB({100: [[1, 2], [3, 4]]}, "euw", cb);
        },
        function load(cb) {
          Premade.find({}).sort({_id: 1}).exec(cb);
        },
        function check(premades, cb) {
          assert.equal(premades.length, 4);
          assert.deepEqual(premades[0].toObject(), {_id: "euw:1", premades: [2]});
          assert.deepEqual(premades[1].toObject(), {_id: "euw:2", premades: [1]});
          assert.deepEqual(premades[2].toObject(), {_id: "euw:3", premades: [4]});
          assert.deepEqual(premades[3].toObject(), {_id: "euw:4", premades: [3]});

          cb();
        }
      ], done);
    });

    it("should update existing premades records", function(done) {
      async.waterfall([
        function add(cb) {
          var premade = new Premade();
          premade._id = "euw:1";
          premade.premades = [5];
          premade.save(cb);
        },
        function save(premade, count, cb) {
          Premade.savePremadesToDB({100: [[1, 2, 3]]}, "euw", cb);
        },
        function load(cb) {
          Premade.find({}).sort({_id: 1}).exec(cb);
        },
        function check(premades, cb) {
          assert.equal(premades.length, 3);
          assert.deepEqual(premades[0].toObject(), {_id: "euw:1", premades: [5, 2, 3]});
          assert.deepEqual(premades[1].toObject(), {_id: "euw:2", premades: [1, 3]});
          assert.deepEqual(premades[2].toObject(), {_id: "euw:3", premades: [1, 2]});

          cb();
        }
      ], done);
    });

    it("should skip existing premades associations", function(done) {
      async.waterfall([
        function add(cb) {
          var premade = new Premade();
          premade._id = "euw:1";
          premade.premades = [2];
          premade.save(cb);
        },
        function save(premade, count, cb) {
          Premade.savePremadesToDB({100: [[1, 2, 3]]}, "euw", cb);
        },
        function load(cb) {
          Premade.find({}).sort({_id: 1}).exec(cb);
        },
        function check(premades, cb) {
          assert.equal(premades.length, 3);
          assert.deepEqual(premades[0].toObject(), {_id: "euw:1", premades: [2, 3]});
          assert.deepEqual(premades[1].toObject(), {_id: "euw:2", premades: [1, 3]});
          assert.deepEqual(premades[2].toObject(), {_id: "euw:3", premades: [1, 2]});

          cb();
        }
      ], done);
    });

    it("should skip empty premades", function(done) {
      async.waterfall([
        function save(cb) {
          Premade.savePremadesToDB({100: [[1], [2], [3]]}, "euw", cb);
        },
        function load(cb) {
          Premade.find({}).sort({_id: 1}).exec(cb);
        },
        function check(premades, cb) {
          assert.equal(premades.length, 0);
          cb();
        }
      ], done);
    });
  });
});
