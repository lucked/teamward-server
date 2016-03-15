"use strict";

var express = require('express');
var app = express();

var handlers = require('./handler/');

app.get('/game/data', handlers.game.data.get);

module.exports = app;
