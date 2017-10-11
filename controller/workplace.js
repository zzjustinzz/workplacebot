'use strict';

var _ = require('lodash');
var workplace_config = require('../config/workplace_config');
var config = require('../config/config');
var mongoose = require('mongoose');
var XLSX = require('xlsx');
var convertExcel = require('excel-as-json').processFile;
var fs = require('fs');
var _ = require('lodash');

var Client = require('node-rest-client').Client;
var restClient = new Client();
var User = mongoose.model('User');

exports.list_user = function(req, res) {
    var args = {
        headers: {
            'User-Agent': config.user_agent,
            Authorization: workplace_config.HEADER_AUTH_VAL_PREFIX + workplace_config.WORKPLACE_ACCESS_TOKEN,
            mimetypes: {
                json: ['application/json', 'application/json; charset=utf-8', 'application/scim+json']
            }
        } // request headers 
    };
    restClient.get('https://www.facebook.com/scim/v1/Users', args,
        function(data, response) {
            if (response.statusCode === 200) {
                var restData = JSON.parse(data.toString('utf8'));
                if (!restData.Errors) {
                    res.json(restData);
                } else {
                    res.json({
                        message: 'Error when request to Facebook API'
                    })
                }
            } else {
                res.json({
                    message: 'Error when request to Facebook API'
                })
            }
        },
        function(err) {
            console.log('Failed to request to Facebook API: ' + err);
            res.json({
                message: 'Error when request to Facebook API'
            })
        });
};

exports.create_user = function(req, res) {
    var args = {
        data: {
            schemas: [workplace_config.SCHEME_CORE, workplace_config.SCHEME_NTP],
            userName: req.body.userName,
            name: {
                formatted: req.body.name
            },
            active: req.body.active,
            emails: [{
                primary: true,
                'type': 'work',
                'value': req.body.email
            }],
            addresses: [{
                'type': "work",
                'formatted': req.body.address,
                'primary': true
            }],
            'urn:scim:schemas:extension:enterprise:1.0': {
                'department': req.body.department
            }
        },
        headers: {
            'User-Agent': config.user_agent,
            Authorization: workplace_config.HEADER_AUTH_VAL_PREFIX + workplace_config.WORKPLACE_ACCESS_TOKEN,
            mimetypes: {
                json: ['application/json', 'application/json; charset=utf-8', 'application/scim+json']
            },
            'Content-Type': 'application/json'
        } // request headers 
    };
    var parseUser = function(fbUserData) {
        var parsedData = {
            id: fbUserData.id,
            userName: fbUserData.userName,
            name: fbUserData.name.formatted,
            active: fbUserData.active,
            emails: fbUserData.emails
        }
        if (fbUserData['urn:scim:schemas:extension:enterprise:1.0'] && fbUserData['urn:scim:schemas:extension:enterprise:1.0'].department) {
            parsedData.department = fbUserData['urn:scim:schemas:extension:enterprise:1.0'].department;
        }
        if (fbUserData.addresses) {
            parsedData.addresses = fbUserData.addresses;
        }
        return parsedData;
    };
    restClient.post('https://www.facebook.com/scim/v1/Users', args,
        function(data, response) {
            var restData = JSON.parse(data.toString('utf8'));
            if (response.statusCode === 201) {
                if (!restData.Errors) {
                    var parsedUser = parseUser(restData);
                    var user = new User(parsedUser);
                    user.save(function(err) {
                        if (err) {
                            console.log(err);
                        }
                    });
                    res.json(restData);
                } else {
                    res.json({
                        message: 'Error when request to Facebook API'
                    })
                }
            } else {
                res.json({
                    message: 'Error when request to Facebook API'
                })
            }
        },
        function(err) {
            console.log('Failed to request to Facebook API: ' + err);
            res.json({
                message: 'Error when request to Facebook API'
            })
        });
};

exports.read_excel = function(req, res) {
    var buf = fs.readFileSync('./controller/assets/test.xlsx');
    var wb = XLSX.read(buf, { type: 'buffer' });
    convertExcel('./controller/assets/test.xlsx', undefined, { sheet: '2', isColOriented: false }, function(err, data) {
        console.log(data);
    });
    console.log(wb.SheetNames.length);
};