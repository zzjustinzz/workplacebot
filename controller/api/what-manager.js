'use strict';

var _ = require('lodash');
var workplace_config = require('../../config/workplace_config');
var config = require('../../config/config');

var Client = require('node-rest-client').Client;
var restClient = new Client();

var get_header = function() {
    return {
        'User-Agent': config.user_agent,
        Authorization: workplace_config.HEADER_AUTH_VAL_PREFIX + workplace_config.WORKPLACE_ACCESS_TOKEN,
        mimetypes: {
            json: ['application/json', 'application/json; charset=utf-8', 'application/scim+json']
        }
    };
};

var find_user_by_email = function(user) {
    return new Promise((resolve, reject) => {
        var args = {};
        args.headers = get_header();
        args.parameters = {
            filter: 'userName eq "' + user + '"'
        };
        restClient.get(workplace_config.HOST + workplace_config.WORKPLACE_SUFFIX + '/' + workplace_config.WORKPLACE_VERSION + '/' + workplace_config.USERS_RESOURCE_SUFFIX, args,
            function(data, response) {
                var restData = JSON.parse(data.toString('utf8'));
                if (response.statusCode === 200 && !restData.Errors) {
                    if (restData.Resources.length > 0) {
                        resolve(restData.Resources[0]);
                    } else {
                        reject({
                            message: 'Not found any user match to ' + user,
                            errCode: 1
                        });
                    }
                } else {
                    reject({
                        message: 'Failed to update to workplace: ' + restData.Errors
                    });
                }
            },
            function(err) {
                reject({
                    message: 'Error when request to Facebook API: ' + err
                })
            });
    });
};

var find_user_by_id = function(user) {
    return new Promise((resolve, reject) => {
        var args = {};
        args.headers = get_header();
        if (!user['urn:scim:schemas:extension:enterprise:1.0']) {
            reject({
                message: 'User doesnt have any manager',
                errCode: 1
            });
        } else {
            if (!user['urn:scim:schemas:extension:enterprise:1.0'].manager) {
                reject({
                    message: 'User doesnt have any manager',
                    errCode: 1
                });
            } else {
                var managerId = user['urn:scim:schemas:extension:enterprise:1.0'].manager.managerId;
                restClient.get(workplace_config.HOST + workplace_config.WORKPLACE_SUFFIX + '/' + workplace_config.WORKPLACE_VERSION + '/' + workplace_config.USERS_RESOURCE_SUFFIX + '/' + managerId, args,
                    function(data, response) {
                        var restData = JSON.parse(data.toString('utf8'));
                        if (response.statusCode === 200) {
                            resolve(restData);
                        } else {
                            reject({
                                message: 'Not found any user match to ' + user,
                                errCode: 1
                            });
                        }
                    },
                    function(err) {
                        reject({
                            message: 'Error when request to Facebook API: ' + err
                        })
                    });
            }
        }
    });
};

exports.find_user = function(user) {
    return new Promise((resolve, reject) => {
        find_user_by_email(user)
            .then(find_user_by_id)
            .then(function(res) {
                resolve(res);
            })
            .catch(function(err) {
                reject(err);
            });
    });
};