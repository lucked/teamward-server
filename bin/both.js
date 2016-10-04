require('newrelic');

var dotenv = require('dotenv');
dotenv.load();

require('./server.js');

if(require('cluster').isMaster) {
  // Ensure the worker is only started once.
  require('./worker.js');
}
