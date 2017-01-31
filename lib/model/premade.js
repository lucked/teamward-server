'use strict';

var mongoose = require('mongoose');
var rarity = require("rarity");


// You're not expected to use this model as-is,
// You should always pass by the exposed static helpers that abstract the way data is stored
var PremadeSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  premades: {
    type: Array,
    required: true,
  },
}, {
  // Disable __v key.
  // We use mongo bulk update operations directly, so we don't need Mongoose here
  versionKey: false
});


// Some premades are retrieved from match history, but for better accuracy most of them are stored in the DB.
// This function retrieves all relevant documents for specified summonerIds
PremadeSchema.statics.loadKnownPremadesFromDB = function loadKnownPremadesFromDB(summonerIds, region, cb) {
  var prefix = region.toLowerCase() + ":";
  var lookingFor = summonerIds.map(function(id) {
    return prefix + id;
  });

  mongoose.model("Premade").find({_id: {$in: lookingFor}}).read('secondaryPreferred').exec(function(err, premades) {
    if(err) {
      return cb(err);
    }

    var ret = {};
    premades.forEach(function(premade) {
      ret[premade._id.replace(prefix, '')] = premade.premades.toObject();
    });

    cb(null, ret);
  });
};


// Save new premades data in an atomic way to mongo
// premades should be the output of the getPremades() function
PremadeSchema.statics.savePremadesToDB = function savePremadesToDB(premadesObject, region, cb) {
  var prefix = region.toLowerCase() + ":";
  var premades = Object.keys(premadesObject).reduce(function(acc, key) {
    return acc.concat(premadesObject[key]);
  }, []);

  // See http://stackoverflow.com/questions/12161538/batch-update-with-mongoose
  // And https://docs.mongodb.com/v3.0/reference/method/Bulk.find.upsert/#Bulk.find.upsert
  var bulk = mongoose.model('Premade').collection.initializeUnorderedBulkOp();
  var bulkIsEmpty = true;
  premades.forEach(function(premade) {
    if(premade.length === 1) {
      return;
    }
    bulkIsEmpty = false;

    premade.forEach(function(summonerId) {
      bulk.find({_id: prefix + summonerId}).upsert().updateOne({
        $addToSet: {
          premades: {
            $each: premade.filter(function(id) {
              return id !== summonerId;
            })
          }
        }
      });
    });
  });

  if(bulkIsEmpty) {
    process.nextTick(cb, null);
  }
  else {
    bulk.execute(rarity.slice(1, cb));
  }
};


module.exports = mongoose.model("Premade", PremadeSchema);
