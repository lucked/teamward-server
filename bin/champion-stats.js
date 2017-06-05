"use strict";
require('newrelic');
var common = require('./_common');

require('../app');

require('../lib/task/champion-stats')(common.opbeat, true);
