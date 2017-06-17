"use strict";
var async = require("async");

var ddragon = require('../../ddragon/');

module.exports = function getSpellData(participants, region, cb) {

  async.reduce(participants, {}, function(acc, participant, cb) {
    async.parallel({
      spellD: ddragon.getSummonerSpellData.bind(this, 'euw', participant.spell1Id),
      spellF: ddragon.getSummonerSpellData.bind(this, 'euw', participant.spell2Id)
    }, function(err, ddragonRes) {
      if(err) {
        return cb(err);
      }

      acc[participant.summonerId] = {
        spellD: {
          id: ddragonRes.spellD.id,
          name: ddragonRes.spellD.name,
          image: ddragonRes.spellD.image_url,
        },
        spellF: {
          id: ddragonRes.spellF.id,
          name: ddragonRes.spellF.name,
          image: ddragonRes.spellF.image_url,
        }
      };
      cb(null, acc);
    });
  }, cb);
};
