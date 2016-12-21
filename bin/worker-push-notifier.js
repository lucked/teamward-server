"use strict";
require('newrelic');
var common = require('./_common.js');

require('../app');

// Start worker
if(!process.env.DISABLE_WORKER_PUSH_NOTIFIER) {
  require('../lib/worker/push-notifier')(common.opbeat);
}
