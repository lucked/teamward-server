"use strict";

var express = require('express');
var app = express();

var handlers = require('./lib').handler;

app.get('/game/data', handlers.game.data.get);

module.exports = app;
