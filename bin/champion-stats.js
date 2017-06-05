"use strict";
require('newrelic');
var common = require('./_common');

require('../app');

require('../lib/worker/champion-stats')(common.opbeat, true);
