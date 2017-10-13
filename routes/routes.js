'use strict';

var workplace_accounts = require('../controller/workplace-accounts');
var workplace_groups = require('../controller/workplace-groups');

module.exports = function(app) {
    var Client = require('node-rest-client').Client;
    var restClient = new Client();
    var fs = require('fs');

    //Account 
    app.route('/api/users')
        .get(workplace_accounts.list_user)
        .post(workplace_accounts.create_user);

    app.route('/api/excel/accounts')
        .get(workplace_accounts.read_excel_accounts);

    app.route('/api/excel/groups')
        .get(workplace_groups.read_excel_groups);
};