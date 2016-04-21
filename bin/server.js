"use strict";
if(process.env.OPBEAT_APP_ID) {
  var opbeat = require('opbeat').start({
    appId: process.env.OPBEAT_APP_ID,
    organizationId: process.env.OPBEAT_ORGANIZATION_ID,
    secretToken: process.env.OPBEAT_SECRET_TOKEN
  });
}
var throng = require('throng');

var start = function() {
  var app = require('../app');

  app.use(opbeat.middleware.express());
  app.listen(process.env.PORT || 3000, function() {
    console.log('App listening on port 3000!');
  });
};

throng(process.env.WEB_CONCURRENCY || 1, start);
