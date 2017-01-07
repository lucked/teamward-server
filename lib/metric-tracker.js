"use strict";

var net = require('net');
var newrelic = require("newrelic");
var apikey = process.env.HOSTEDGRAPHITE_APIKEY;

module.exports = function(dottedMetricName, metricValue) {
  if(!apikey) {
    return;
  }

  newrelic.recordMetric(dottedMetricName.replace(/\./g, "/"), metricValue);

  var socket = net.createConnection(2003, "carbon.hostedgraphite.com", function() {
    socket.write(apikey + '.' + dottedMetricName + ' ' + metricValue + '\n');
    socket.end();
  });
};
