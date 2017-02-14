"use strict";
require('@risingstack/trace');

require('./_common');
require('../app');

// Start worker
if(!process.env.DISABLE_WORKER_PUSH_NOTIFIER) {
  require('../lib/worker/push-notifier/queue')({loop: true});
}
