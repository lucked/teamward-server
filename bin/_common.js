"use strict";

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

module.exports = {
  opbeat: opbeat
};
