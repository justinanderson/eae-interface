const { interface_constants } = require('../core/models.js');
const { ErrorHelper } = require('eae-utils');

/**
 * @fn AuditController
 * @desc Controller to manage the audit and logging of the platform
 * @param accessLogger Helper class to log the requests
 * @constructor
 */
function AuditController(accessLogger) {
    this._accessLogger = accessLogger;

    // Bind member functions
    this.getPublicAudit = AuditController.prototype.getPublicAudit.bind(this);
    this.getAllPublicAudit = AuditController.prototype.getAllPublicAudit.bind(this);
    this.getPrivateAudit = AuditController.prototype.getPrivateAudit.bind(this);
    this.addToPublicAudit = AuditController.prototype.addToPublicAudit.bind(this);
}

/**
 * @fn getPublicAudit
 * @desc HTTP method GET handler to serve the public audit
 * @param req Express.js request object
 * @param res Express.js response object
 */
AuditController.prototype.getPublicAudit = function(req, res) {

};

/**
 * @fn getAllPublicAudit
 * @desc HTTP method GET handler to serve the public audit
 * @param req Express.js request object
 * @param res Express.js response object
 */
AuditController.prototype.getAllPublicAudit = function(req, res) {

};

/**
 * @fn getPrivateAudit
 * @desc HTTP method GET handler to serve the private audit. ADMIN only.
 * Serves all illegal access logged in Mongo.
 * @param req Express.js request object
 * @param res Express.js response object
 */
AuditController.prototype.getPrivateAudit = function(req, res) {
    let _this = this;
    let userToken = req.body.opalUserToken;

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        let filter = {
            token: userToken
        };
        _this._usersCollection.findOne(filter).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                return;
            }
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn addToPublicAudit
 * @desc HTTP method GET handler to serve the public audit
 * @param req Express.js request object
 * @param res Express.js response object
 */
AuditController.prototype.addToPublicAudit = function(req, res) {

};

module.exports = AuditController;
