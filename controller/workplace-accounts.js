'use strict';

var _ = require('lodash');
var workplace_config = require('../config/workplace_config');
var config = require('../config/config');
var mongoose = require('mongoose');
var convertExcel = require('excel-as-json').processFile;
var what_manager = require('./api/what-manager');

var Client = require('node-rest-client').Client;
var restClient = new Client();
var User = mongoose.model('User');

var get_header = function() {
    return {
        'User-Agent': config.user_agent,
        Authorization: workplace_config.HEADER_AUTH_VAL_PREFIX + workplace_config.WORKPLACE_ACCESS_TOKEN,
        mimetypes: {
            json: ['application/json', 'application/json; charset=utf-8', 'application/scim+json']
        }
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

exports.list_user = function(req, res) {
    var args = {};
    args.headers = get_header();
    if (req.query.user) {
        findUser(req.query.user)
            .then(function(user) {
                res.json(user);
            })
            .catch(function(err) {
                res.json(500, err);
            });
    } else {
        restClient.get(workplace_config.HOST + workplace_config.WORKPLACE_SUFFIX + '/' + workplace_config.WORKPLACE_VERSION + '/' + workplace_config.USERS_RESOURCE_SUFFIX, args,
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
    }
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
        } // request headers 
    };
    args.headers = get_header();
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
    restClient.post(workplace_config.HOST + workplace_config.WORKPLACE_SUFFIX + '/' + workplace_config.WORKPLACE_VERSION + '/' + workplace_config.USERS_RESOURCE_SUFFIX, args,
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

exports.read_excel_accounts = function(req, res) {
    console.log('Start import from excel file');
    convertExcel(config.excel_path, undefined, undefined, function(err, data) {
        let i = 0;
        let e = 0;
        let complete = data.length;
        Promise.all(data.map(function(userexcel) {
            return createUser(userexcel)
                .then(function(res) {
                    i++;
                    console.log('Success to create ' + res.userName + '(' + i + '/' + complete + ')');
                })
                .catch(function(err) {
                    e++;
                    console.log(err);
                });
        })).then(function(res) {
            console.log('Done: ' + i + '/' + complete);
            console.log('Fail: ' + e + '/' + complete);
            data.forEach(function(userexcel) {
                updateManagerID(userexcel);
            });
        });
        res.json({
            message: 'Importing to workplace'
        });
    });
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

var createUser = function(userexcel) {
    return new Promise((resolve, reject) => {
        if (userexcel.username !== '') {
            var args = {
                data: {
                    schemas: [workplace_config.SCHEME_CORE, workplace_config.SCHEME_NTP],
                    userName: userexcel.username,
                    name: {
                        formatted: userexcel.name
                    },
                    active: true,
                    emails: [{
                        primary: true,
                        'type': 'work',
                        'value': userexcel.email
                    }],
                    addresses: [{
                        'type': "work",
                        'formatted': userexcel.address,
                        'primary': true
                    }],
                    'urn:scim:schemas:extension:enterprise:1.0': {
                        'department': userexcel.department
                    }
                }
            };
            args.headers = get_header();
            restClient.post(workplace_config.HOST + workplace_config.WORKPLACE_SUFFIX + '/' + workplace_config.WORKPLACE_VERSION + '/' + workplace_config.USERS_RESOURCE_SUFFIX, args,
                function(data, response) {
                    var restData = JSON.parse(data.toString('utf8'));
                    if (response.statusCode === 201 && !restData.Errors) {
                        var parsedUser = parseUser(restData);
                        var user = new User(parsedUser);
                        user.save(function(err) {
                            if (err) {
                                reject({
                                    message: 'Error when save to DB ' + err
                                });
                            } else {
                                resolve(restData);
                            }
                        });
                    } else if (response.statusCode === 409) {
                        reject({
                            message: 'Duplicate user at ' + userexcel.username
                        })
                    } else {
                        reject({
                            message: 'Error when save to workplace at ' + userexcel.username
                        })
                    }
                },
                function(err) {
                    console.log('Failed to request to Facebook API: ' + err);
                    reject({
                        message: 'Error when send request to Facebook API at' + userexcel.username
                    })
                });
        } else {
            reject({
                message: 'Username is empty'
            })
        }
    });
}

var getUserDB = function(username) {
    return new Promise((resolve, reject) => {
        User.findOne({
            userName: username
        }).exec(function(err, user) {
            if (err || user === null) {
                reject({
                    message: 'Cannot find user in DB: ' + err
                });
            }
            resolve(user);
        });
    });
};

var updateMangerToUser = function(manager, userexcel) {
    return new Promise((resolve, reject) => {
        getUserDB(userexcel.username)
            .then(function(user) {
                var args = {
                    data: {
                        schemas: [workplace_config.SCHEME_CORE, workplace_config.SCHEME_NTP, workplace_config.SCHEME_SMD, workplace_config.SCHEME_ASD],
                        id: user.id,
                        userName: user.userName,
                        name: {
                            formatted: user.name
                        },
                        active: true,
                        emails: user.emails,
                        addresses: user.addresses,
                        "urn:scim:schemas:extension:enterprise:1.0": {
                            department: user.department,
                            manager: {
                                managerId: manager.id
                            }
                        }

                    }
                };
                args.headers = get_header();
                restClient.put(workplace_config.HOST + workplace_config.WORKPLACE_SUFFIX + '/' + workplace_config.WORKPLACE_VERSION + '/' + workplace_config.USERS_RESOURCE_SUFFIX + '/' + user.id, args,
                    function(data, response) {
                        var restData = JSON.parse(data.toString('utf8'));
                        if (response.statusCode === 200 && !restData.Errors) {
                            user.managerId = manager.id;
                            user.save(function(err) {
                                if (err) {
                                    reject({
                                        message: 'Error when save to DB ' + err
                                    });
                                } else {
                                    resolve(restData);
                                }
                            });
                        } else {
                            reject({
                                message: 'Failed to update to workplace: ' + restData.Errors
                            });
                        }
                    },
                    function(err) {
                        reject({ message: 'Failed to request to Facebook API: ' + err });
                    });
            })
            .catch(function(err) {
                reject(err);
            });
    });
};

var updateManagerID = function(userexcel) {
    if ((userexcel.manager) && (userexcel.manager !== '')) {
        getUserDB(userexcel.manager)
            .then(function(manager) {
                updateMangerToUser(manager, userexcel)
                    .then(function(res) {
                        console.log('Updated success: ' + manager.userName + ' was manager of ' + userexcel.username);
                    })
                    .catch(function(err) {
                        console.log(err);
                    });
            })
            .catch(function(err) {
                console.log(err);
            });
    }
}

exports.read_excel = function(req, res) {
    console.log('Start import from excel file');
    convertExcel(config.excel_path, undefined, undefined, function(err, data) {
        if (err) {
            console.log(err);
        } else {
            let i = 0;
            let e = 0;
            let complete = data.length;
            Promise.all(data.map(function(userexcel) {
                return createUser(userexcel)
                    .then(function(res) {
                        i++;
                        console.log('Success to create ' + res.userName + '(' + i + '/' + complete + ')');
                    })
                    .catch(function(err) {
                        e++;
                        console.log(err);
                    });
            })).then(function(res) {
                console.log('Done: ' + i + '/' + complete);
                console.log('Fail: ' + e + '/' + complete);
                data.forEach(function(userexcel) {
                    updateManagerID(userexcel);
                });
            });
            res.json({
                message: 'Importing to workplace'
            });
        }
    });
};

exports.find_manager = function(req, res) {
    what_manager.find_user(req.query.user)
        .then(function(response) {
            res.json(response);
        })
        .catch(function(err) {
            res.json(500, {
                error: err
            });
        });
};