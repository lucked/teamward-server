"use strict";

module.exports = function(req, res, next) {
  if(!req.query.summoner) {
    res.status(409).send('Missing summoner param!');
    return;
  }

  if(!req.query.region) {
    res.status(409).send('Missing region param!');
    return;
  }

  next();
};