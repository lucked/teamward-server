"use strict";
require('newrelic');

var log = require('debug')('teamward:bin:server');

var common = require('./_common');

require('heroku-self-ping')(process.env.APP_URL);

var throng = require('throng');

var start = function() {
  var app;
  if(process.env.IS_HEROKU) {
    var express = require('express');
    app = express();

    app.get('/*', function(req, res) {
      res.set('location', 'https://app.teamward.xyz' + req.originalUrl);
      res.status(302).send();
    });
  }
  else {
    app = require('../app');
  }

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
