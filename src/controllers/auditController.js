const { interface_constants } = require('../core/models.js');
const { ErrorHelper } = require('eae-utils');
const fs = require('fs');

/**
 * @fn AuditController
 * @desc Controller to manage the audit and logging of the platform
 * @param accessLogger Helper class to log the requests
 * @param auditDirectory Directory containing the log files
 * @param usersManagement Helper for the management of users
 * @constructor
 */
function AuditController(accessLogger, auditDirectory, usersManagement) {
    this._accessLogger = accessLogger;
    this._auditDirectory = auditDirectory;
    this.usersManagement = usersManagement;

    // Bind member functions
    this.getPublicAudit = AuditController.prototype.getPublicAudit.bind(this);
    this.getPrivateAudit = AuditController.prototype.getPrivateAudit.bind(this);
}

/**
 * @fn getPublicAudit
 * @desc HTTP method GET handler to serve the public audit
 * @param req Express.js request object
 * @param res Express.js response object
 */
AuditController.prototype.getPublicAudit = function(req, res) {
    let _this = this;
    let options = {
        root:  _this._auditDirectory,
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };

    let fileName = req.params.name;
    if (fs.existsSync(_this._auditDirectory + '/' + fileName)) {
        res.sendFile(fileName, options, function (err) {
            if (err) {
                _this._accessLogger.logIllegalAccess(req);
            } else {
                _this._accessLogger.logAuditAccess(req);
            }
        });
    }else{
        res.status(404);
        res.json(ErrorHelper('File Not found'));
    }
};

/**
 * @fn getPrivateAudit
 * @desc HTTP method POST handler to serve the private audit. ADMIN only.
 * Serves all illegal access logged in Mongo.
 * @param req Express.js request object
 * @param res Express.js response object
 */
AuditController.prototype.getPrivateAudit = function(req, res) {
    let _this = this;
    let userToken = req.body.opalUserToken;
    let numberOfRecords = parseInt(req.body.numberOfRecords);
    let logType = req.body.logType;

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
                _this._accessLogger.dumpPrivateLog(logType, numberOfRecords).then(function (fileName) {
                    let options = {
                        dotfiles: 'deny',
                        headers: {
                            'x-timestamp': Date.now(),
                            'x-sent': true
                        }
                    };

                    if (fs.existsSync(fileName)) {
                        res.sendFile(fileName, options, function (err) {
                            if (err) {
                                _this._accessLogger.logIllegalAccess(req);
                            }
                        });
                    } else {
                        res.status(404);
                        res.json(ErrorHelper('File Not found'));
                    }
                }, function (error) {
                    res.status(500);
                    res.json(ErrorHelper('Error occurred', error));
                });
            }
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

module.exports = AuditController;
