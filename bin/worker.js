"use strict";
require('newrelic');

var dotenv = require('dotenv');
dotenv.config({silent: true});


var opbeat;
if(process.env.OPBEAT_APP_ID) {
  opbeat = require('opbeat');

  if(!global.__opbeat_initialized) {
    opbeat.start({
      appId: process.env.OPBEAT_APP_ID,
      organizationId: process.env.OPBEAT_ORGANIZATION_ID,
      secretToken: process.env.OPBEAT_SECRET_TOKEN
    });
  }
}

if(!process.env.GCM_API_KEY) {
  throw new Error("Missing required environment variable GCM_API_KEY");
}

require('../app');

// Start worker
if(!process.env.DISABLE_WORKER_PUSH_NOTIFIER) {
  require('../lib/worker/push-notifier')(opbeat);
}

require('../lib/worker/champion-stats')(opbeat);
// require('../lib/worker/game-crawler')(opbeat);
