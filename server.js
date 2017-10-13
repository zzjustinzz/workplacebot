'use strict'

var config = require('./config/config');
var mongoose = require('mongoose');
mongoose.connect(config.db);
require('./model/user');
require('./model/group');

// Handle the connection event
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function() {
    console.log("DB connection alive");
});

var express = require('express'),
    app = express(),
    port = process.env.PORT || 5000,
    bodyParser = require('body-parser');

var bot = require('./controller/bot-builder');
var routes = require('./routes/routes');

switch (process.env.NODE_ENV) {
    case 'staging':
        port = config.env.staging.port;
        break;
    case 'production':
        port = config.env.production.port;
        break;
    default:
        port = config.env.development.port;
        break;
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    next();
}).options('*', function(req, res, next) {
    res.end();
});

routes(app);

app.listen(port);

console.log('Leave Management bot server started on: ' + port);

// Index route
app.get('/', function(req, res) {
    res.send('Hello world, I am Leave Management System Bot.')
})

app.post('/api/messages', bot.listen());