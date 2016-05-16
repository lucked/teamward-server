'use strict';
var async = require("async");
var mongoose = require("mongoose");
var rarity = require("rarity");

module.exports.get = function(req, res, next) {
  if(!req.query.token) {
    res.status(409).send('Missing token param!');
    return;
  }

  async.waterfall([
    function saveToken(cb) {
      var payload = {
        region: req.query.region,
        summonerName: req.query.summoner,
        token: req.query.token
      };

      mongoose.model('Token').update({token: req.query.token}, payload, {upsert: true}, rarity.slice(1, cb));
    },
    function sendResponse(cb) {
      res.sendStatus(204);

      cb();
    }
  ], next);
};
