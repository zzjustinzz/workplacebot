var _ = require('lodash');
var workplace_config = require('../config/workplace_config');
var config = require('../config/config');
var mongoose = require('mongoose');
var convertExcel = require('excel-as-json').processFile;

var Client = require('node-rest-client').Client;
var restClient = new Client();
var Group = mongoose.model('Group');

var get_header = function() {
    return {
        'User-Agent': config.user_agent,
        Authorization: workplace_config.HEADER_AUTH_VAL_PREFIX + workplace_config.WORKPLACE_ACCESS_TOKEN,
        mimetypes: {
            json: ['application/json', 'application/json; charset=utf-8', 'application/scim+json']
        },
        'Content-Type': 'application/json'
    };
};

var findUser = function(user) {
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
                            message: 'Not found any user match to ' + user
                        });
                    }
                } else {
                    reject({
                        message: 'Failed to get user from workplace: ' + restData.Errors
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

var addMember = function(user, groupId) {
    return new Promise((resolve, reject) => {
        var args = {};
        args.headers = get_header();
        restClient.post(workplace_config.GRAPH_URL_PREFIX + groupId + '/' + workplace_config.MEMBERS_SUFFIX + '/' + user.id, args,
            function(data, response) {
                var restData = JSON.parse(data.toString('utf8'));
                if (response.statusCode === 200) {
                    resolve(restData);
                } else {
                    reject({
                        message: 'Error when add member ' + user.userName + ' to group ' + groupId
                    });
                }
            },
            function(err) {
                console.log('Failed to request to Facebook API: ' + err);
                reject({
                    message: 'Error when send request to Facebook API at ' + user.userName + ' to group ' + groupId
                })
            });
    });
};

var addMemberToGroup = function(member, group) {
    return new Promise((resolve, reject) => {
        if (member === '') {
            reject({
                message: 'User is empty'
            });
        } else {
            return findUser(member)
                .then(function(user) {
                    return addMember(user, group)
                        .then(function(res) {
                            console.log('Success to add ' + user.userName + ' to group ' + restData.id);
                            resolve(res);
                        })
                        .catch(function(err) {
                            reject(err);
                        });
                })
                .catch(function(err) {
                    reject(err);
                });
        }
    });
};

var sendCreateGroup = function(args) {
    return new Promise((resolve, reject) => {
        restClient.post(workplace_config.GRAPH_URL_PREFIX + workplace_config.COMMUNITY_SUFFIX + '/' + workplace_config.GROUPS_SUFFIX, args,
            function(data, response) {
                var restData = JSON.parse(data.toString('utf8'));
                if (response.statusCode === 200) {
                    if (args.members) {
                        let success = 0;
                        let errCount = 0;
                        let members = [];
                        Promise.all(args.members.map(function(member) {
                            return addMemberToGroup(member, restData.id)
                                .then(function(res) {
                                    success++;
                                    members.push(member);
                                })
                                .catch(function(err) {
                                    console.log(err);
                                    errCount++;
                                })
                        })).then(function(res) {
                            console.log('+++ Add all members to group ' + restData.id + ' was done:');
                            console.log('+ Success: ' + success);
                            console.log('+ Error: ' + errCount);
                            args.data.members = members;
                            args.data.id = restData.id;
                            var group = new Group(args.data);
                            group.save(function(err) {
                                if (err) {
                                    reject({
                                        message: 'Error when save to DB ' + err
                                    });
                                } else {
                                    resolve(restData);
                                }
                            });
                        });
                    }
                } else {
                    reject({
                        message: 'Error when save to workplace at ' + args.data.name
                    })
                }
            },
            function(err) {
                console.log('Failed to request to Facebook API: ' + err);
                reject({
                    message: 'Error when send request to Facebook API at' + args.data.name
                })
            });
    });
};

var createGroup = function(groupexcel) {
    return new Promise((resolve, reject) => {
        if (groupexcel.name !== '') {
            var args = {
                data: {
                    name: groupexcel.name,
                    description: groupexcel.description,
                    privacy: groupexcel.privacy.toUpperCase()
                }
            };
            args.headers = get_header();
            args.members = groupexcel.members;
            if (groupexcel.admin && groupexcel.admin !== '') {
                findUser(groupexcel.admin)
                    .then(function(user) {
                        args.data.admin = user.id;
                        sendCreateGroup(args)
                            .then(function(res) {
                                resolve(res);
                            })
                            .catch(function(err) {
                                reject(err);
                            });
                    })
                    .catch(function(err) {
                        reject(err);
                    });
            } else {
                sendCreateGroup(args)
                    .then(function(res) {
                        resolve(res);
                    })
                    .catch(function(err) {
                        reject(err);
                    });
            }
        } else {
            reject({
                message: 'Name is empty'
            });
        }
    });
}

exports.read_excel_groups = function(req, res) {
    console.log('***** Start import from excel file');
    convertExcel(config.excel_path, undefined, { sheet: '2' }, function(err, data) {
        if (err) {
            console.log(err);
        } else {
            let i = 0;
            let e = 0;
            let complete = data.length;
            Promise.all(data.map(function(groupexcel) {
                return createGroup(groupexcel)
                    .then(function(res) {
                        i++;
                        console.log('*** Success to create group with id ' + res.id + '(' + i + '/' + complete + ')');
                    })
                    .catch(function(err) {
                        e++;
                        console.log(err);
                    });
            })).then(function(res) {
                console.log('***** Create group process was done: ')
                console.log('* Done: ' + i + '/' + complete);
                console.log('* Fail: ' + e + '/' + complete);
            });
            res.json({
                message: 'Importing to workplace'
            });
        }
    });
};

exports.list_groups = function(req, res) {
    var args = {};
    args.headers = get_header();
    if (req.query.user) {
        findUser(req.query.user)
            .then(function(user) {
                restClient.get(workplace_config.GRAPH_URL_PREFIX + user.id + '/' + workplace_config.GROUPS_SUFFIX, args,
                    function(data, response) {
                        var restData = JSON.parse(data.toString('utf8'));
                        if (response.statusCode === 200) {
                            res.json(restData);
                        } else {
                            res.json(500, {
                                message: 'Something was wrong'
                            });
                        }
                    },
                    function(err) {
                        res.json(500, {
                            message: err
                        });
                    });
            })
            .catch(function(err) {
                res.json(500, {
                    message: err
                });
            });
    } else {
        restClient.get(workplace_config.GRAPH_URL_PREFIX + workplace_config.COMMUNITY_SUFFIX + '/' + workplace_config.GROUPS_SUFFIX, args,
            function(data, response) {
                var restData = JSON.parse(data.toString('utf8'));
                if (response.statusCode === 200) {
                    res.json(restData);
                } else {
                    res.json(500, {
                        message: 'Something was wrong'
                    });
                }
            },
            function(err) {
                res.json(500, {
                    message: err
                });
            });
    }
};