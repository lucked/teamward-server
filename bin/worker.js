"use strict";

var opbeat;
if(process.env.OPBEAT_APP_ID) {
  opbeat = require('opbeat').start({
    appId: process.env.OPBEAT_APP_ID,
    organizationId: process.env.OPBEAT_ORGANIZATION_ID,
    secretToken: process.env.OPBEAT_SECRET_TOKEN
  });
}

require('../app');

// Start worker
require('../lib/worker/worker')(opbeat);
