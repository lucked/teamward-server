"use strict";
require('newrelic');
require('@risingstack/trace');

var log = require('debug')('teamward:bin:server');

var common = require('./_common');

require('heroku-self-ping')(process.env.APP_URL);

var throng = require('throng');

var start = function() {
  var app = require('../app');

  if(common.opbeat) {
    app.use(common.opbeat.middleware.express());
  }

  var port = process.env.PORT || 3000;
  app.listen(port, function() {
    log('App listening on port ' + port + '!');
  });
};

var concurrency = process.env.WEB_CONCURRENCY || 1;

log("Initializing app with concurrency=" + concurrency);
throng(concurrency, start);
