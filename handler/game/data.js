'use strict';

module.exports.get = function(req, res) {
  if(!req.query.summoner) {
    res.status(409).send('Missing summoner param!');
    return;
  }

  if(!req.query.region) {
    res.status(409).send('Missing region param!');
    return;
  }

  res.send('Hello World!');
};
