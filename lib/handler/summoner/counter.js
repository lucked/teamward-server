"use strict";

var async = require("async");
var mongoose = require("mongoose");
var log = require('debug')('teamward:handler:summoner-counter');

var errorLogger = require('../../error-logger');

var computeCounters = require('../../helper/counter.js');
var summonerInfo = require('../../riot-api/summoner-info-v3.js');
var ddragon = require('../../ddragon');
var availableRoles = new Set(["TOP", "MID", "SUPPORT", "BOT", "JUNGLE"]);


module.exports.get = function(req, res) {
  if(!req.query.role) {
    res.status(409).send('Missing role param!');
    return;
  }

  var role = req.query.role.toUpperCase();
  if(!availableRoles.has(role)) {
    res.status(409).send('Invalid role param (TOP, MID, JUNGLE, BOT or JUNGLE)!');
    return;
  }

  if(!req.query.level) {
    res.status(409).send('Missing level param!');
    return;
  }

  if(isNaN(req.query.level) || req.query.level > 7) {
    res.status(409).send('Invalid level param (integer between 0 and 7)!');
    return;
  }
  var level = req.query.level;

  async.auto({
    loadSummonerData: function loadSummonerData(cb) {
      summonerInfo.getSummonerData(req.query.summoner, req.query.region, function(err, data) {
        if(!data) {
          err = new Error("Summoner does not exist!");
          err.statusCode = 404;
          err.noExternalTracking = true;
        }

        cb(err, data);
      });
    },
    loadRoleChampions: function(cb) {
      // Get all champions with the required roles from DB
      var Champion = mongoose.model("Champion");

      Champion.find({roles: role}).read('secondaryPreferred').exec(cb);
    },
    loadChampionMasteries: ["loadSummonerData", function(res, cb) {
      var summonerId = res.loadSummonerData.id;

      summonerInfo.getChampions(summonerId, req.query.region, cb);
    }],
    computeCounters: ["loadRoleChampions", "loadChampionMasteries", function(res, cb) {
      var masteredChampions = res.loadChampionMasteries.filter(function(champion) {
        return champion.championLevel >= level;
      });

      computeCounters(res.loadRoleChampions, masteredChampions, role, cb);
    }],
    addImages: ["computeCounters", function(res, cb) {
      async.each(res.computeCounters, function(counter, cb) {
        var list = [counter.champion];
        counter.counters.forEach(function(counter) {
          list.push(counter);
        });

        async.each(list, function(champion, cb) {
          ddragon.getChampionData('euw', champion.id, function(err, championData) {
            champion.image = championData.image_url;
            champion.gg = championData.gg_url;
            cb();
          });
        }, cb);
      }, cb);
    }],
    sendData: ["computeCounters", "addImages", function(r, cb) {
      res.send({
        counters: r.computeCounters
      });

      cb();
    }]
  },
  function(err) {
    if(err) {
      errorLogger(err, {
        req: req,
        log: log
      });
      res.status(err.statusCode || 500).send(err.toString());

      return;
    }
  });

};
