"use strict";

var express = require('express');
var app = express();

app.get('/game/data', function(req, res) {
  if(!req.params.summoner) {
    res.status(409).send('Missing summoner param!');
  }

  if(!req.params.summoner) {
    res.status(409).send('Missing summoner param!');
  }
  res.send('Hello World!');
});

app.listen(process.env.PORT || 3000, function() {
  console.log('Example app listening on port 3000!');
});
