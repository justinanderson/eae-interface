let crypto = require('crypto');
const { ErrorHelper, Constants } = require('eae-utils');

/**
 * @fn InterfaceUtils
 * @desc Utility class
 * @param config
 * @constructor
 */
function InterfaceUtils(config = {}) {
    let _this = this;
    _this.config = config;

    // Bind member functions
    _this.generateToken = InterfaceUtils.prototype.generateToken.bind(this);
    _this.isBackendAlive = InterfaceUtils.prototype.isBackendAlive.bind(this);
}

/**
 * @fn generateToken
 * @desc Genereates an AES token to be used as a token by the user for authentication
 * @returns {string}
 */
InterfaceUtils.prototype.generateToken =  function(userProfile) {
    let salt = crypto.randomBytes(32);
    let iterations = 10000;
    let keyByteLength = 512; // desired length for an AES key
    let password = userProfile.username + userProfile.created;

    return crypto.pbkdf2Sync(password, salt, iterations, keyByteLength, 'sha512').toString('hex');
};

/**
 * @fn isBackendAlive
 * @desc Tests if at least one compute and scheduler service are alive
 * @returns {Promise<Boolean>}
 */
InterfaceUtils.prototype.isBackendAlive = function() {
    let _this = this;

    return new Promise(function (resolve, reject) {
        let time = new Date();
        time.setHours(time.getMinutes() - 5);
        let types = [Constants.EAE_SERVICE_TYPE_COMPUTE, Constants.EAE_SERVICE_TYPE_SCHEDULER];
        let filter = {
            type: {$in: types},
            lastUpdate: {
                '$gte': new Date(0),
                '$lt': time
            }
        };

        let backendServices = {};
        _this.config.statusCollection.find(filter).toArray().then(function(docs) {
                docs.forEach(function (node) {
                    backendServices[node.type] += 1;
                });
                let keys = Object.keys(backendServices);
                if(keys.length === 2){
                    resolve(true);
                }else{
                    resolve(false);
                }
            },function(error) {
                reject(ErrorHelper('Retrieve Nodes Status has failed', error));
            }
        );
    });
};


module.exports = InterfaceUtils;
