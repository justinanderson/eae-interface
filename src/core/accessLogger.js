const { interface_models } = require('../core/models.js');

/**
 * @fn AccessLogger
 * @desc Service to log illegal accesses
 * @param accessLogCollection
 * @param illegalAccessCollection
 * @constructor
 */
function AccessLogger(accessLogCollection,illegalAccessCollection) {
    let _this = this;
    _this._accessLogCollection = accessLogCollection;
    _this._illegalAccessLogCollection = illegalAccessCollection ;

    // Bind member functions
    this.logIllegalAccess = AccessLogger.prototype.logIllegalAccess.bind(this);
    this.logAuditAccess = AccessLogger.prototype.logAuditAccess.bind(this);
    this.logRequest = AccessLogger.prototype.logRequest.bind(this);
}

/**
 * @fn logIllegalAccess
 * @desc Methods that logs illegal accesses
 * @param request Illegal request to be logged
 */
AccessLogger.prototype.logIllegalAccess = function(request){
    let _this = this;
    let unauthorizedAccessModel = interface_models.UNAUTHORIZED_ACCESS_MODEL;
    let unauthorizedAccess = Object.assign({}, unauthorizedAccessModel,
                                            {username: request.body.opalUsername,
                                            token: request.body.opalUserToken,
                                            headers:  request.headers});
    _this._illegalAccessLogCollection.insertOne(unauthorizedAccess);
};

/**
 * @fn logIllegalAccess
 * @desc Methods that logs audit accesses
 * @param request Access request to be logged
 */
AccessLogger.prototype.logAuditAccess = function(request){
    let _this = this;
    let authorizedAccessModel = {headers:  request.headers, accessTimestamp: new Date()};
    _this._accessLogCollection.insertOne(authorizedAccessModel);
};

/**
 * @fn logRequest
 * @desc Methods that logs the valid user requests
 * @param request Access request to be logged
 */
AccessLogger.prototype.logRequest = function(request){
    let _this = this;
    // write the request to the global file and to the monthly one

};

module.exports = AccessLogger;
