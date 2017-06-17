"use strict";

var assert = require("assert");
var mongoose = require("mongoose");

var getTeamwardUsers = require('../../../lib/helper/game-data-v3/get-teamward-users.js');

describe("getTeamwardUsers()", function() {
  var Token = mongoose.model('Token');
  beforeEach(function(done) {
    Token.remove({}, done);
  });

  beforeEach(function(done) {
    var token = new Token();
    token.region = "euw";
    token.summonerName = "Neamar";
    token.summonerId = 70448430;
    token.summonerProfileId = 3706;
    token.token = "fake";
    token.save(done);
  });

  it("should return true for teamward users", function(done) {
    getTeamwardUsers([70448430, 70448431], 'euw', function(err, data) {
      assert.ifError(err);
      assert.equal(data[70448430], true);
      assert.equal(data[70448431], false);

      done();
    });
  });
});
