'use strict';

var log = require('debug')('teamward:handler:game-data');

var gameData = require('../../helpers/game-data.js');

module.exports.get = function(req, res) {
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
