var builder = require('botbuilder');
var apiairecognizer = require('./apiAIRecognizer');
var config = require('../config/config');

var connector = new builder.ChatConnector({
    appId: config.MICROSOFT_APP_ID,
    appPassword: config.MICROSOFT_APP_PASSWORD
});

var bot = new builder.UniversalBot(connector);
var recognizer = new apiairecognizer(config.API_AI_CLIENT_ACCESS_TOKEN);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });

bot.dialog('/', intents);

intents.matches('hi', function(session) {
    session.send('It\'s 27 degrees celsius');
});

intents.onDefault(function(session) {
    session.send('I missed what you said. Say it again?');
});

module.exports = connector;