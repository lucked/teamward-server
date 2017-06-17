"use strict";

var createPool = require('./create-pool.js');

var defaultPool;
module.exports = function() {
  if(!defaultPool) {
    defaultPool = createPool(10);
  }

  return defaultPool;
};
