'use strict';

var log = require('debug')('gss:handler:game-data');

var gameData = require('../../helpers/game-data.js');

module.exports.get = function(req, res) {
  if(!req.query.summoner) {
    res.status(409).send('Missing summoner param!');
    return;
  }

  if(!req.query.region) {
    res.status(409).send('Missing region param!');
    return;
  }

  var start = new Date();
  gameData(req.query.summoner, req.query.region, function(err, data) {
    if(err) {
      log(err);
      res.status(err.statusCode || 500).send(err.toString());
      return;
    }

    var delta = new Date() - start;
    log("Fetched game information for " + req.query.summoner + " in " + delta + "ms");
    res.send(data);
  });
};
