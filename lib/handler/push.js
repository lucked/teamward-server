'use strict';
var async = require("async");
var mongoose = require("mongoose");
var rarity = require("rarity");

var errorLogger = require('../error-logger');
var summonerInfo = require('../riot-api/summoner-info.js');

module.exports.get = function(req, res) {
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
      if(!summonerData || (summonerData.status_code && summonerData.status_code === 403)) {
        var err = new Error("Summoner does not exist!");
        err.statusCode = 404;
        return cb(err);
      }

      payload.summonerId = summonerData.id;
      payload.summonerProfileId = summonerData.profileIconId;
      mongoose.model('Token').update({token: req.query.token}, payload, {upsert: true}, rarity.slice(1, cb));
    },
    function sendResponse(cb) {
      res.send(payload);

      cb();
    }
  ], function(err) {
    if(err) {
      errorLogger(err, {req: req});
      res.status(err.statusCode || 500).send(err.toString());
    }
  });
};
