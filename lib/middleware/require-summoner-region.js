"use strict";
var request = require('../riot-api/request.js');

module.exports = function(req, res, next) {
  if(!req.query.summoner) {
    res.status(409).send('Missing summoner param!');
    return;
  }

  if(!req.query.region) {
    res.status(409).send('Missing region param!');
    return;
  }

  req.query.region = req.query.region.toLowerCase();

  if(!request.getPlatformFromRegion(req.query.region)) {
    res.status(409).send('Invalid region param!');
    return;
  }

  next();
};
