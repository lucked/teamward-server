'use strict';
var config = require('../../../config');

module.exports.get = function(req, res) {
  res.send(config.riot.verifyKey);
};
