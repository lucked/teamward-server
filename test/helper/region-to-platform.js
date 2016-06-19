'use strict';

var assert = require('assert');
var regionToPlatform = require('../../lib/helper/region-to-platform.js');

describe("regionToPlatform()", function() {
  it('should return platfrom from region', function() {
    assert('EUW1', regionToPlatform('euw'));
    // Should be case insensitive
    assert('EUN1', regionToPlatform('EUNE'));
  });
});
