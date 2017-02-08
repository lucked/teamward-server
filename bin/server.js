"use strict";
require('newrelic');
var log = require('debug')('teamward:bin:server');

var common = require('./_common');

require('heroku-self-ping')(process.env.APP_URL);

var app = require('../app');

if(common.opbeat) {
  app.use(common.opbeat.middleware.express());
}

var port = process.env.PORT || 3000;
app.listen(port, function() {
  log('App listening on port ' + port + '!');
});
