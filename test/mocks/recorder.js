"use strict";
var nock = require('nock');
var fs = require("fs");

var TEST_BASE_FOLDER = __dirname;


function getMockFilePath(mochaContext) {
  var testName = mochaContext.test.parent.title + " " + mochaContext.test.title;
  testName = testName.replace(/ /g, "_").toLowerCase();

  return TEST_BASE_FOLDER + "/" + testName + ".json";
}


module.exports.recordTest = function(mochaContext) {
  require("../../lib/riot-api/cache.js").disableCaching = true;

  var records = [];
  var testPath = getMockFilePath(mochaContext);

  // if(fs.existsSync(testPath)) {
  //   throw new Error("Recording file already exists!");
  // }

  nock.recorder.rec({
    output_objects: true,
    use_separator: false,
    logging: function(d) {
      if(d.status === 429) {
        return;
      }

      // Strip API key
      d.path = d.path.replace(/(\?|\&)api_key=.+$/g, '');
      records.push(d);
    }
  });

  return function writeMocks() {
    fs.writeFileSync(testPath, JSON.stringify(records, null, 2));
  };
};


module.exports.setupNock = function(mochaContext) {
  var testPath = getMockFilePath(mochaContext);

  var nocks = require(testPath);

  nocks.forEach(function(n) {
    nock(n.scope)[n.method](n.path)
      .query(true)
      .reply(n.status, n.response, n.headers);
  });

  return function() {};
};
