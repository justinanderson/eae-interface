const request = require('request');

/**
 * @fn AlgorithmHelper
 * @desc Algorithms manager. Use it to update the available algorithms in OPAL
 * @param algoServiceURL URL of the algorithm service
 * @param algorithmsSpecsFolder schemas of the algorithms
 * @constructor
 */
function CacheHelper(cacheURL) {
    //Init member vars
    this.cacheURL = cacheURL;

    //Bind member functions
    this.sendRequestToCache = CacheHelper.prototype.sendRequestToCache.bind(this);
}

CacheHelper.prototype.sendRequestToCache = function(job) {
    let _this = this;

    return new Promise(function(resolve, reject) {
        request(
            {
                method: 'POST',
                baseUrl: _this.cacheURL,
                uri: '/query',
                json: true,
                body: {
                    job: job
                }
            }, function(error, _unused__, body) {
                if (!error) {
                    resolve(body);
                }
                else {
                    reject(error);
                }
            });
    });
};

module.exports = CacheHelper;
