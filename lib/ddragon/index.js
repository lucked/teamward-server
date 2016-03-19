'use strict';

var async = require("async");
var supertest = require("supertest");


var cache = {};
function downloadOrGetFromCache(endpoint, cb) {
  if(cache[endpoint]) {
    return cb(null, cache[endpoint]);
  }

  supertest('http://ddragon.leagueoflegends.com')
    .get(endpoint)
    .end(function(err, res) {
      if(err) {
        return cb(err);
      }

      try {
        var json = JSON.parse(res.text);
        cache[endpoint] = json;
        cb(null, json);
      }
      catch(e) {
        console.log(e.toString());
        console.log(res.text);
        throw e;
      }

    });
}


module.exports.currentPatch = function(region, cb) {
  downloadOrGetFromCache('/realms/' + region + '.json', function(err, patchData) {
    cb(err, patchData && patchData.v);
  });
};


module.exports.getChampionsData = function(patch, cb) {
  downloadOrGetFromCache('/cdn/' + patch + '/data/en_US/champion.json', cb);
};


module.exports.getSummonerSpellsData = function(patch, cb) {
  downloadOrGetFromCache('/cdn/' + patch + '/data/en_US/summoner.json', cb);
};


module.exports.getChampionData = function(region, championId, cb) {
  championId = parseInt(championId);

  async.waterfall([
    module.exports.currentPatch.bind(null, region),
    module.exports.getChampionsData,
    function(championsData, cb) {
      var championsNames = Object.keys(championsData.data);
      for(var i = 0; i < championsNames.length; i += 1) {
        var championData = championsData.data[championsNames[i]];
        championData.image_url = 'http://ddragon.leagueoflegends.com/cdn/6.5.1/img/champion/' + championData.image.full;

        if(parseInt(championData.key) === championId) {
          return cb(null, championData);
        }
      }

      return cb(new Error("Unknown champion: " + championId));
    }
  ], cb);
};


module.exports.getSummonerSpellData = function(region, spellId, cb) {
  spellId = parseInt(spellId);

  async.waterfall([
    module.exports.currentPatch.bind(null, region),
    module.exports.getSummonerSpellsData,
    function(spellsData, cb) {
      var spellsName = Object.keys(spellsData.data);
      for(var i = 0; i < spellsName.length; i += 1) {
        var spellData = spellsData.data[spellsName[i]];

        if(parseInt(spellData.key) === spellId) {
          spellData.image_url = 'http://ddragon.leagueoflegends.com/cdn/6.5.1/img/spell/' + spellData.id + '.png';

          return cb(null, spellData);
        }
      }

      return cb(new Error("Unknown spell: " + spellId));
    }
  ], cb);
};
