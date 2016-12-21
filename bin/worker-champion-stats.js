"use strict";
require('newrelic');
var common = require('./_common.js');

require('../app');

require('../lib/worker/champion-stats')(common.opbeat);
