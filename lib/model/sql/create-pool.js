"use strict";

var Pool = require("pg").Pool;
var url = require("url");

var config = require('../../../config');

module.exports = function getPool(maxConnections) {
  const params = url.parse(config.sqlUrl);
  const auth = params.auth.split(':');

  var pool = new Pool({
    user: auth[0],
    password: auth[1],
    host: params.hostname,
    port: params.port,
    database: params.pathname.split('/')[1],
    ssl: true,
    min: 2,
    max: maxConnections
  });

  return pool;
};
