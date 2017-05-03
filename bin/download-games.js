"use strict";
require('newrelic');

var throng = require('throng');

require('./_common');
require('../app');

// Start worker
if(!process.env.DISABLE_DOWNLOAD_GAMES) {
  throng(1, require('../lib/worker/download-games'));
}
