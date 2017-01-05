"use strict";
require('newrelic');
require('./_common');

require('../app');

// Start workers
require('./worker-push-notifier');
require('./worker-champion-stats');
