"use strict";
require('newrelic');

require('../app.js');

require('../lib/task/send-stats')();

