"use strict";

var assert = require("assert");

var getSpellData = require('../../../lib/helper/game-data-v3/get-spell-data.js');

describe("getSpellData()", function() {
  it("should return all spell data", function(done) {
    getSpellData([{summonerId: 70448430, spell1Id: 12, spell2Id: 4}], 'euw', function(err, data) {
      assert.ifError(err);
      assert.equal(data[70448430].spellD.name, "Teleport");
      assert.equal(data[70448430].spellF.name, "Flash");
      assert.ok(data[70448430].spellD.image);
      assert.ok(data[70448430].spellF.image);
      done();
    });
  });
});
