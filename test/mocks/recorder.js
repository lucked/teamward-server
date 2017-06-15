"use strict";
var nock = require('nock');
var fs = require("fs");
var log = require("debug")("teamward:test:recorder");

var TEST_BASE_FOLDER = __dirname + "/mocks";


function getMockFilePath(mochaContext) {
  var testName = mochaContext.test.parent.title + " " + mochaContext.test.title;
  testName = testName.replace(/[^a-z]/gi, "_").toLowerCase();

  return TEST_BASE_FOLDER + "/" + testName + ".json";
}

/**
 * HOW TO USE?
 *
 * This function is to be used the first time you write a test and you want to persist the HTTP results.
 *
 * In the beginning of your test, call this function with "this" and done.
 * You'll get a function returned, once your test is over just call this function to save all the mocks to disk (hint: overwrite the done function from mocha).
 * You can now replace the call to setupNock with a call to useNock, and magic will happen (HTTP requests will be read from disk)
 */
module.exports.setupNock = function setupNock(mochaContext, done) {
  var records = [];
  var testPath = getMockFilePath(mochaContext);

  if(fs.existsSync(testPath)) {
    console.warn("Overwriting existing mock files");
  }

  nock.recorder.rec({
    output_objects: true,
    use_separator: false,
    logging: function(d) {
      log("Recorded " + d.scope + d.path);
      if(d.status === 429) {
        return;
      }

      if(d.scope.indexOf("http://127.0.0.1") === 0) {
        return;
      }

      // Remove all GET parameters, including API key
      d.path = d.path.replace(/\?.+$/g, '');
      records.push(d);
    }
  });

  return function writeMocks(err) {
    // Delay call to done, to ensure we catch all ongoing requests.
    setTimeout(function() {
      fs.writeFileSync(testPath, JSON.stringify(records, null, 2));
      nock.restore();
      done(err);
    }, 500);
  };
};


module.exports.useNock = function useNock(mochaContext, done) {
  // Disabled for now, see
  // https://github.com/node-nock/nock/issues/211
  // nock.disableNetConnect();
  var testPath = getMockFilePath(mochaContext);

  var nocks = require(testPath);

  nocks.forEach(function(n) {
    log("Replaying " + n.method + " " + n.scope + n.path);
    nock(n.scope)[n.method.toLowerCase()](n.path)
      .query(true)
      .reply(n.status, n.response, n.headers);
  });

  return function(err) {
    // nock.enableNetConnect();
    done(err);
  };
};
