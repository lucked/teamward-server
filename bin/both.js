require('newrelic');
require('./_common');

require('./server');

if(require('cluster').isMaster) {
  // Ensure the workers are only started once.
  // (server.js clusterize the app, spawning new process that would create a new worker too)
  require('./workers');
}
