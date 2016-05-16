'use strict';
var async = require("async");
var mongoose = require("mongoose");
var rarity = require("rarity");

var summonerInfo = require('../riot-api/summoner-info.js');

module.exports.get = function(req, res, next) {
  if(!req.query.token) {
    res.status(409).send('Missing token param!');
    return;
  }
  var payload = {
    region: req.query.region,
    summonerName: req.query.summoner,
    token: req.query.token
  };

  async.waterfall([
    function getSummonerId(cb) {
      summonerInfo.getSummonerData(payload.summonerName, payload.region, cb);
    },
    function saveToken(summonerData, cb) {
      if(!summonerData) {
        return cb(new Error("Unknown summoner :("));
      }

      payload.summonerId = summonerData.id;
      mongoose.model('Token').update({token: req.query.token}, payload, {upsert: true}, rarity.slice(1, cb));
    },
    function sendResponse(cb) {
      res.send(payload);

      cb();
    }
  ], next);
};
