const { interface_models, interface_constants } = require('../core/models.js');
const { ErrorHelper } = require('eae-utils');
const InterfaceUtils = require('../core/interfaceUtils.js');

/**
 * @fn UsersController
 * @desc Controller to manage the users service
 * @param usersCollection
 * @param accessLogger
 * @param userManagement
 * @constructor
 */
function UsersController(usersCollection, accessLogger, userManagement) {
    let _this = this;
    _this._usersCollection = usersCollection;
    _this._accessLogger = accessLogger;
    _this.utils = new InterfaceUtils();
    _this.usersManagement = userManagement;

    // Bind member functions
    _this.getUser = UsersController.prototype.getUser.bind(this);
    _this.getAllUsers = UsersController.prototype.getAllUsers.bind(this);
    _this.createUser = UsersController.prototype.createUser.bind(this);
    _this.updateUser = UsersController.prototype.updateUser.bind(this);
    _this.deleteUser = UsersController.prototype.deleteUser.bind(this);
    _this.getAllUsers = UsersController.prototype.getAllUsers.bind(this);
    _this.resetUserPassword = UsersController.prototype.resetUserPassword.bind(this);
}


/**
 * @fn getUser
 * @desc Sends back the profile of the requested user
 * @param req Incoming message
 * @param res Server Response
 */
UsersController.prototype.getUser = function(req, res){
    let _this = this;
    let requestedUsername = req.body.requestedUsername;
    let userToken = req.body.opalUserToken;

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        _this.usersManagement.checkPassword(userToken).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                _this._usersCollection.findOne({username: requestedUsername}).then(function(user){
                        if (user === null) {
                            res.status(401);
                            res.json('User ' + requestedUsername + ' doesn\'t exist.');
                        }else {
                            delete user._id;
                            res.status(200);
                            res.json(user);
                        }
                    },
                    function(error){
                        res.status(500);
                        res.json(ErrorHelper('Internal Mongo Error', error));
                    });
            }else{
                res.status(401);
                res.json(ErrorHelper('The user is not authorized to access this command'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
            }
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn getAllUsers
 * @desc Sends back the profile of the requested user
 * @param req Incoming message
 * @param res Server Response
 */
UsersController.prototype.getAllUsers = function(req, res){
    let _this = this;
    let userToken = req.body.eaeUserToken;
    let userType = req.body.userType.toUpperCase();

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        _this.usersManagement.checkPassword(userToken).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (!(userType === interface_constants.USER_TYPE.admin || userType === interface_constants.USER_TYPE.standard || userType === 'ALL')){
                res.status(401);
                res.json(ErrorHelper('userType not supported. Please use "ADMIN", "STANDARD" OR "ALL"'));
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                let querycond = userType === 'ALL' ? {} : {type: userType};
                _this._usersCollection.find(querycond,{username: 1, _id:0}).toArray(function(err,user){
                        if (err){
                            res.status(500);
                            res.json(ErrorHelper('Internal Mongo Error', err));
                            return;
                        }else {
                            res.status(200);
                            res.json(user);
                        }
                    }
                    );
            }else{
                res.status(401);
                res.json(ErrorHelper('The user is not authorized to access this command'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
            }
        });
    }
    catch (error) {
        res.status(510);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn createUser
 * @desc Create a new user to get access to the platform. ADMIN only
 * @param req Incoming message
 * @param res Server Response
 */
UsersController.prototype.createUser = function(req, res){
    let _this = this;
    let userToken = req.body.opalUserToken;
    let newUser = Object.assign({},interface_models.USER_MODEL, JSON.parse(req.body.newUser));
    newUser.token = _this.utils.generateToken(newUser);

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        _this.usersManagement.checkPassword(userToken).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                if(newUser.username === null || newUser.username === undefined){
                    res.status(400);
                    res.json(ErrorHelper('Request not well formed. The new user username cannot be null or undefined'));
                    return;
                }
                //check that user doesn't already exists
                _this._usersCollection.findOne({username: newUser.username}).then(function (user) {
                    if(user === null){
                        // Delegate the creation of the user record to user management service
                        _this.usersManagement.validateUserAndInsert(newUser).then(function(){
                            res.status(200);
                            res.json(newUser);
                        }, function (error) {
                            res.status(500);
                            res.json(error);
                        });
                    }else{
                        res.status(409);
                        res.json('The user ' + newUser.username + ' already exists.');
                    }
                },function(error){
                    res.status(500);
                    res.json(ErrorHelper('Internal Mongo Error', error));
                });
            }else{
                res.status(401);
                res.json(ErrorHelper('The user is not authorized to access this command'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
            }
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn updateUser
 * @desc Update an existing user. ADMIN only
 * @param req Incoming message
 * @param res Server Response
 */
UsersController.prototype.updateUser = function(req, res) {
    let _this = this;
    let userToBeUpdated = req.body.userToBeUpdated;
    let update = JSON.parse(req.body.userUpdate);
    delete update.token; // we prevent any attempt at updating the user's token.
    let userToken = req.body.opalUserToken;

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        _this.usersManagement.checkPassword(userToken).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                //check that user already exists
                _this._usersCollection.findOne({username: userToBeUpdated}).then(function (user) {
                    if(user !== null){
                        // Delegate the update of the user record to user management service
                        _this.usersManagement.updateUser(user, update).then(function(updatedUser){
                            res.status(200);
                            res.json(updatedUser);
                        }, function (error) {
                            res.status(500);
                            res.json(error);
                        });
                    }else{
                        res.status(409);
                        res.json('The user ' + userToBeUpdated.username + ' doesn\'t exists. Record not updated.');
                    }
                },function(error){
                    res.status(500);
                    res.json(ErrorHelper('Internal Mongo Error', error));
                });
            }else{
                res.status(401);
                res.json(ErrorHelper('The user is not authorized to access this command'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
            }
        });
    }catch (error) {
            res.status(500);
            res.json(ErrorHelper('Error occurred', error));
        }
};


/**
 * @fn resetUserPassword
 * @desc Resets the password for the specified user. ADMIN only
 * @param req Incoming message
 * @param res Server Response
 */
UsersController.prototype.resetUserPassword = function(req, res) {
    let _this = this;
    let userToBeUpdated = req.body.userToBeUpdated;
    let userToken = req.body.opalUserToken;

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        _this.usersManagement.checkPassword(userToken).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                //check that user already exists
                _this._usersCollection.findOne({username: userToBeUpdated}).then(function (user) {
                    if(user !== null){
                        // Delegate the update of the user record to user management service
                        _this.usersManagement.resetPassword(user).then(function(newPassword){
                            res.status(200);
                            res.json(newPassword);
                        }, function (error) {
                            res.status(500);
                            res.json(error);
                        });
                    }else{
                        res.status(409);
                        res.json('The user ' + userToBeUpdated.username + ' doesn\'t exists. Record not updated.');
                    }
                },function(error){
                    res.status(500);
                    res.json(ErrorHelper('Internal Mongo Error', error));
                });
            }else{
                res.status(401);
                res.json(ErrorHelper('The user is not authorized to access this command'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
            }
        });
    }catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn deleteUser
 * @desc Delete an existing user to remove access to the platform
 * @param req Incoming message
 * @param res Server Response
 */
UsersController.prototype.deleteUser = function(req, res){
    let _this = this;
    let userToBeDeleted = req.body.userToBeDeleted;
    let userToken = req.body.opalUserToken;

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        _this.usersManagement.checkPassword(userToken).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                //check that user doesn't already exists
                _this._usersCollection.findOne({username: userToBeDeleted}).then(function (user) {
                    if(user !== null){
                        _this._usersCollection.deleteOne({username: userToBeDeleted}).then(function(_unused__deleted){
                                res.status(200);
                                res.json('The user ' + userToBeDeleted + ' has been successfully deleted');
                            },
                            function(error){
                                res.status(500);
                                res.json(ErrorHelper('Internal Mongo Error', error));
                            });
                    }else{
                        res.status(409);
                        res.json('The user ' + userToBeDeleted + ' doesn\'t exists.');
                    }
                },function(error){
                    res.status(500);
                    res.json(ErrorHelper('Internal Mongo Error', error));
                });
            }else{
                res.status(401);
                res.json(ErrorHelper('The user is not authorized to access this command'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
            }
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

module.exports = UsersController;
