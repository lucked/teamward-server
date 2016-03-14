"use strict";

var express = require('express');
var app = express();

app.get('/game/data', function(req, res) {
  if(!req.params.summoner) {
    res.status(409).send('Missing summoner param!');
    return;
  }

  if(!req.params.summoner) {
    res.status(409).send('Missing summoner param!');
    return;
  }
  res.send('Hello World!');
});

module.exports = app;
