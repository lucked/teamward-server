'use strict';
var mongoose = require("mongoose");


before(function(done) {
  mongoose.model('HttpCache').remove({}, done);
});
