"use strict";
require('newrelic');

require('./_common');
require('../app');

// Start worker
if(!process.env.DISABLE_WORKER_DOWNLOAD_GAMES) {
  require('../lib/worker/download-games')();
}
