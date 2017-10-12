var builder = require('botbuilder');
var apiairecognizer = require('./apiAIRecognizer');
var config = require('../config/config');
var _ = require('lodash');

var connector = new builder.ChatConnector({
    appId: config.MICROSOFT_APP_ID,
    appPassword: config.MICROSOFT_APP_PASSWORD
});

var bot = new builder.UniversalBot(connector);
var recognizer = new apiairecognizer(config.API_AI_CLIENT_ACCESS_TOKEN);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });

bot.dialog('/', intents);

intents.matches('hi', function(session, dialog) {
    console.log(dialog);
    session.send('Hi there.');
});

var find_email_entity = function(entities) {
    return _.find(entities, { type: 'email' });
};

intents.matches('what-manager', function(session, dialog) {
    var what_manager = require('./api/what-manager');

    var user = find_email_entity(dialog.entities).entity;
    what_manager.find_user(user)
        .then(function(res) {
            session.send('Manager of ' + user + ' is ' + res.userName);
        })
        .catch(function(err) {
            if (err.errCode) {
                session.send(err.message);
            } else {
                console.log(err);
                session.send('Something wrong.');
            }
        });
});

intents.onDefault(function(session) {
    session.send('I missed what you said. Say it again?');
});

module.exports = connector;