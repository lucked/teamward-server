"use strict";
require('newrelic');

require('./_common');

// Start worker
if(!process.env.DISABLE_DOWNLOAD_GAMES) {
  require('../lib/worker/download-games')();
}
