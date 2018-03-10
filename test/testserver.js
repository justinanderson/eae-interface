let express = require('express');
let OpalInterface = require('../src/opalInterface.js');
let config = require('../config/opal.interface.test.config.js');
const uuidv4 = require('uuid/v4');
const { interface_constants, interface_models } = require('../src/core/models.js');

function TestServer() {
    // Bind member vars
    this._app = express();

    // Bind member functions
    this.run = TestServer.prototype.run.bind(this);
    this.stop = TestServer.prototype.stop.bind(this);
    this.addAdminUser = TestServer.prototype.addAdminUser.bind(this);
    this.addCluster = TestServer.prototype.addCluster.bind(this);
}

TestServer.prototype.run = function() {
    let _this = this;
    return new Promise(function(resolve, reject) {
        // Setup node env to test during test
        process.env.TEST = 1;
        // let oldMongoConfig = config.mongoURL;
        //TODO: I had to comment the line below because otherwise cache couldn't access same database
        // config.mongoURL = oldMongoConfig + uuidv4().toString().replace(/-/g, '');

        // Create opal interface server
        _this.opal_interface = new OpalInterface(config);

        // Start server
        _this.opal_interface.start().then(function (interface_router) {
            _this._app.use(interface_router);
            _this._server = _this._app.listen(config.port, function (error) {
                if (error)
                    reject(error);
                else {
                    resolve(true);
                }
            });
        }, function (error) {
            reject(error);
        });
    });
};

TestServer.prototype.stop = function() {
    let _this = this;
    return new Promise(function(resolve, reject) {
        // Remove test flag from env
        delete process.env.TEST;
        setTimeout(_this.opal_interface.db.dropDatabase().then(function(){
            _this.opal_interface.stop().then(function() {
                _this._server.close(function(error) {
                        if (error) {
                            reject(error);
                        }else{
                            resolve(true);
                        }});
                });
    }, function (error) {
                    reject(error);
            },function(error){
                reject(error);
            })
    , 5000);
    });
};

TestServer.prototype.addAdminUser = function(username, password){
    let _this = this;
    return new Promise(function(resolve, reject) {
        let admin = {
            type: interface_constants.USER_TYPE.admin,
            username : username,
            token: password,
        };
        let adminUser = Object.assign({}, interface_models.USER_MODEL , admin);
        _this.opal_interface.usersController._usersCollection.insertOne(adminUser).then(function () {
            resolve(true);
        }, function (error) {
            reject(error);
        });
    });
};

TestServer.prototype.addCluster = function(statuses) {
    let _this = this;
    return new Promise(function(resolve, reject) {
        _this.opal_interface.clusterController._statusCollection.insertMany(statuses).then(function () {
            resolve(true);
        }, function (error) {
            reject(error);
        });
    });
};

module.exports = TestServer;
