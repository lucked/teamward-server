require('newrelic');

require('./server.js');

if(require('cluster').isMaster) {
  // Ensure the worker is only started once.
  require('./worker.js');
}
