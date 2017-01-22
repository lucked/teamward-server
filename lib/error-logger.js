"use strict";
var opbeat = require('opbeat');
var newrelic = require("newrelic");

var log = require('debug')('teamward:error-logger');
var config = require('../config/');


/* istanbul ignore next */
module.exports = function logError(err, options) {
  if(!err) {
    return;
  }

  if(!options) {
    options = {};
  }

  if(options.log) {
    // Use custom logger
    log = options.log;
  }

  if(err.noExternalTracking || process.env.NODE_ENV === 'test') {
    // Just print the short version
    log(err.toString());
    return;
  }

  // Display information on console
  log(err);

  var opbeatArgs = {};

  if(options.req) {
    opbeatArgs.request = options.req;
    if(!options.user && options.req.query.summoner) {
      options.user = {
        name: options.req.query.summoner,
        region: options.req.query.region
      };
    }
  }

  if(options.user && options.user.name) {
    opbeatArgs.user = {
      id: options.user.name,
      username: options.user.name,
      region: options.user.region || "???"
    };
  }

  var extra = {
    errStatusCode: err.statusCode,
    riotInternal: err.riotInternal,
    timeout: err.timeout,
    processType: config.processType,
    originalUrl: options.req && options.req.originalUrl
  };

  if(err.extra) {
    for(let attrname in err.extra) {
      extra[attrname] = err.extra[attrname];
    }
  }
  if(options.extra) {
    for(let attrname in err.extra) {
      extra[attrname] = err.extra[attrname];
    }
  }

  opbeatArgs.extra = extra;

  // Track errors on external services
  if(global.__opbeat_initialized) {
    opbeat.captureError(err, opbeatArgs);
  }
  newrelic.noticeError(err, extra);
};
