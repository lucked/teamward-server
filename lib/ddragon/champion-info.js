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
    .expect(200)
    .end(function(err, res) {
      if(err) {
        return cb(err);
      }

      cb(null, res && JSON.parse(res.text));
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


module.exports.getChampionData = function(region, championId, cb) {
  championId = parseInt(championId);

  async.waterfall([
    module.exports.currentPatch.
    bind(null, region),
    module.exports.getChampionsData,
    function(championsData, cb) {
      var championsNames = Object.keys(championsData.data);
      for(var i = 0; i < championsNames.length; i += 1) {
        var championData = championsData.data[championsNames[i]];

        if(parseInt(championData.key) === championId) {
          return cb(null, championData);
        }
      }

      return cb(new Error("Unknown champion: " + championId));
    }
  ], cb);
};
