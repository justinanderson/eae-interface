const request = require('request');
const eaeutils = require('eae-utils');
let config = require('../config/opal.interface.test.config.js');
let TestServer = require('./testserver.js');

let ts = new TestServer();
let adminUsername = 'adminUsername';
let adminPassword = 'qwertyUsername';
beforeAll(function() {
    return new Promise(function (resolve, reject) {
        ts.run().then(function() {
            ts.addAdminUser(adminUsername, adminPassword).then(function(){
                resolve(true);
            },function(insertError){
                reject(insertError);
            });
        }, function (error) {
            reject(error.toString());
        });
    });
});

test('Get Job Missing Credentials Username', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/job',
            json: true,
            body: {
                opalUsername: null,
                opalUserToken: 'wrongpassword'
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(401);
            expect(body).toBeDefined();
            expect(body).toEqual({error:'Missing username or token'});
            done();
        }
    );
});

test('Get Job Missing Credentials token', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/job',
            json: true,
            body: {
                opalUsername: 'test',
                opalUserToken: null
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(401);
            expect(body).toBeDefined();
            expect(body).toEqual({error:'Missing username or token'});
            done();
        }
    );
});

test('Get Job No jobID', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/job',
            json: true,
            body: {
                opalUsername: 'test',
                opalUserToken: 'wrongpassword'
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(401);
            expect(body).toBeDefined();
            expect(body).toEqual({error:'The job request do not exit. The query has been logged.'});
            done();
        }
    );
});

test('Create a Job with a nonsupported algo type', function(done) {
    expect.assertions(4);
    let job = JSON.stringify({
        'startDate': new Date(0),
        'endDate': new Date(10),
        'algorithm': 'unsupported',
        'params': {},
        'aggregationLevel': 'region',
        'aggregationValue': 'Dakar',
        'sample': 0.1
    });
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/job/create',
            json: true,
            body: {
                opalUsername: adminUsername,
                opalUserToken: adminPassword,
                job: job
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(400);
            expect(body).toBeDefined();

            let listOfSupportedAlgos = ['density', 'commuting', 'migration'];

            expect(body.error).toEqual('The requested algo type is currently not supported.' +
                ' The list of supported computations: ' + listOfSupportedAlgos.toString());
            done();
        }
    );
});

test('Create a Job and subsequently get it', function(done) {
    expect.assertions(12);
    let job = JSON.stringify({
        'startDate': new Date(0),
        'endDate': new Date(1),
        'algorithm': 'density',
        'params': {},
        'aggregationLevel': 'region',
        'aggregationValue': 'Dakar',
        'sample': 0.1
    });
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/job/create',
            json: true,
            body: {
                opalUsername: adminUsername,
                opalUserToken: adminPassword,
                job: job
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body.status).toEqual('OK');
            expect(body.jobID).toBeDefined();
            request(
                {
                    method: 'POST',
                    baseUrl: 'http://127.0.0.1:' + config.port,
                    uri: '/job',
                    json: true,
                    body: {
                        opalUsername: adminUsername,
                        opalUserToken: adminPassword,
                        jobID: body.jobID
                    }
                }, function(error, response, body) {
                    if (error) {
                        done.fail(error.toString());
                    }
                    expect(response).toBeDefined();
                    expect(response.statusCode).toEqual(200);
                    expect(body).toBeDefined();
                    expect(body.algorithm).toEqual('density');
                    expect(body.requester).toEqual(adminUsername);
                    expect(body.statusLock).toEqual(false);
                    expect(body.exitCode).toEqual(-1);
                    done();
                });
        }
    );
});

test('Create a Job and subsequently try to create it again', function(done) {
    expect.assertions(9);
    let job = JSON.stringify({
        'startDate': new Date(0),
        'endDate': new Date(1),
        'algorithm': 'density',
        'params': {},
        'aggregationLevel': 'commune',
        'aggregationValue': 'Dakar',
        'sample': 0.1
    });
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/job/create',
            json: true,
            body: {
                opalUsername: adminUsername,
                opalUserToken: adminPassword,
                job: job
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body.status).toEqual('OK');
            expect(body.jobID).toBeDefined();
            request(
                {
                    method: 'POST',
                    baseUrl: 'http://127.0.0.1:' + config.port,
                    uri: '/job/create',
                    json: true,
                    body: {
                        opalUsername: adminUsername,
                        opalUserToken: adminPassword,
                        job: job
                    }
                }, function(error, response, body) {
                    if (error) {
                        done.fail(error.toString());
                    }
                    expect(response).toBeDefined();
                    expect(response.statusCode).toEqual(200);
                    expect(body).toBeDefined();
                    expect(body.status).toEqual('Waiting');
                    done();
                });
        }
    );
});

test('Create a Job and subsequently cancel it', function(done) {
    expect.assertions(10);
    let job = JSON.stringify({
        'startDate': new Date(0),
        'endDate': new Date(15),
        'algorithm': 'density',
        'params': {},
        'aggregationLevel': 'region',
        'aggregationValue': 'Dakar',
        'sample': 0.1
    });
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/job/create',
            json: true,
            body: {
                opalUsername: adminUsername,
                opalUserToken: adminPassword,
                job: job
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body.status).toEqual('OK');
            expect(body.jobID).toBeDefined();
            let jobID = body.jobID;
            request(
                {
                    method: 'POST',
                    baseUrl: 'http://127.0.0.1:' + config.port,
                    uri: '/job/cancel',
                    json: true,
                    body: {
                        opalUsername: adminUsername,
                        opalUserToken: adminPassword,
                        jobID: jobID
                    }
                }, function(error, response, body) {
                    if (error) {
                        done.fail(error.toString());
                    }
                    expect(response).toBeDefined();
                    expect(response.statusCode).toEqual(200);
                    expect(body).toBeDefined();
                    expect(body.status).toEqual('Job ' + jobID + ' has been successfully cancelled.');
                    expect(body.cancelledJob.status).toEqual([eaeutils.Constants.EAE_JOB_STATUS_CANCELLED, eaeutils.Constants.EAE_JOB_STATUS_QUEUED, eaeutils.Constants.EAE_JOB_STATUS_CREATED]);
                    done();
                });
        }
    );
});

afterAll(function() {
    return new Promise(function (resolve, reject) {
        ts.stop().then(function() {
            resolve(true);
        }, function (error) {
            reject(error.toString());
        });
    });
});
