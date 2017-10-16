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

    app.route('/api/getManager')
        .get(workplace_accounts.find_manager);

    app.route('/api/excel/accounts')
        .get(workplace_accounts.read_excel_accounts);

    //Group
    app.route('/api/excel/groups')
        .get(workplace_groups.read_excel_groups);

    app.route('/api/groups')
        .get(workplace_groups.list_groups);
    app.route('/api/groups/:groupId')
        .get(workplace_groups.get_group);
    app.route('/api/groups/:groupId/admins')
        .get(workplace_groups.get_group_admins);
    app.route('/api/groups/:groupId/members')
        .get(workplace_groups.get_group_members);
};