"use strict";

var debug = require('debug');
var dgram  = require('dgram');
var newrelic = require("newrelic");

var apikey = process.env.HOSTEDGRAPHITE_APIKEY;
var log = debug("teamward:metric-tracker");

/* istanbul ignore next */
module.exports = function(dottedMetricName, metricValue) {
  if(!apikey) {
    return;
  }

  newrelic.recordMetric(dottedMetricName.replace(/\./g, "/"), metricValue);

  var client = dgram.createSocket("udp4");
  var message = new Buffer(apikey + '.' + dottedMetricName + ' ' + metricValue + '\n');
  client.send(message, 0, message.length, 2003, "carbon.hostedgraphite.com", function(err) {
    if(err) {
      log("Error sending to Graphite", err);
    }

    client.close();
  });
};
