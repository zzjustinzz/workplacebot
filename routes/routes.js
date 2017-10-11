'use strict';

var workplace = require('../controller/workplace');

module.exports = function(app) {
    var Client = require('node-rest-client').Client;
    var restClient = new Client();
    var fs = require('fs');

    //Account 
    app.route('/api/users')
        .get(workplace.list_user)
        .post(workplace.create_user);

    app.route('/api/excel')
        .get(workplace.read_excel);
};