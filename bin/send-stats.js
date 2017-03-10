"use strict";
require('newrelic');

var async = require("async");
var mongoose = require("mongoose");
var assert = require("assert");

require('../app.js');
var metricTracker = require('../lib/metric-tracker.js');


var queue = async.queue(function(task, cb) {
  console.log(task);
  metricTracker(task.name, task.value);
  setTimeout(cb, 110);
}, 1);

async.parallel([
  function regions(cb) {
    mongoose.model('Token').aggregate([
    {
      $group: {
        _id: "$region",
        count: {$sum: 1}
      }
    }]).read('secondaryPreferred').exec(function(err, res) {
      assert.ifError(err);

      res.forEach(function(regionStats) {
        console.log(regionStats);
        // queue.push({
        //   name: "Tokens.Counter." + regionStats._id.toUpperCase(),
        //   value: regionStats.count
        // });
      });

      cb();
    });
  },
  function premades(cb) {
    mongoose.model('Premade').count(function(err, count) {
      assert.ifError(err);
      queue.push({
        name: "Premades.Counter",
        value: count
      });
      cb();
    });
  },
  function premadesSize(cb) {
    mongoose.model('Premade').aggregate([
    {
      $project: {
        size: {$size: '$premades'}
      }
    },
    {
      $group: {
        _id: "1",
        avg: {$avg: "$size"}
      }
    }]).read('secondaryPreferred').exec(function(err, res) {
      assert.ifError(err);
      queue.push({
        name: "Premades.AverageLength",
        value: res[0].avg
      });
      cb();
    });
  },
  function premadeSizeForTokens(cb) {
    mongoose.model('Token').find({}).select('summonerId region').lean().exec(function(err, res) {
      assert.ifError(err);

      var validIds = res.map(function(t) {
        return t.region + ":" + t.summonerId;
      });

      mongoose.model('Premade').aggregate([
      {
        $match: {
          _id: {$in: validIds}
        }
      },
      {
        $project: {
          size: {$size: '$premades'}
        }
      },
      {
        $group: {
          _id: "1",
          avg: {$avg: "$size"}
        }
      }]).read('secondaryPreferred').exec(function(err, res) {
        assert.ifError(err);
        queue.push({
          name: "Users.AverageLength",
          value: res[0].avg
        });
        cb();
      });
    });
  }
], function(err) {
  if(err) {
    throw err;
  }

  queue.drain = function() {
    console.log("Shutting down.");
    setTimeout(process.exit, 1500);
  };
});
