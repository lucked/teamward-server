"use strict";

var log = require('debug')('gss:handler:summoner-data');
var summonerInfo = require('../../riot-api/summoner-info.js');

module.exports.get = function(req, res) {
  summonerInfo.getSummonerData(req.query.summoner, req.query.region, function(err, data) {
    if(err) {
      log(err);
      res.status(err.statusCode || 500).send(err.toString());
      return;
    }

    res.send(data);
  });
};
