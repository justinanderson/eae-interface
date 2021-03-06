const { ErrorHelper, Constants, DataModels } = require('eae-utils');
const { interface_constants } = require('../core/models.js');
const ObjectID = require('mongodb').ObjectID;
const JobsManagement = require('../core/jobsManagement.js');

/**
 * @fn JobsController
 * @desc Controller to manage the jobs service
 * @param carriers
 * @param jobsCollection
 * @param carrierCollection
 * @param usersCollection
 * @param accessLogger
 * @constructor
 */
function JobsController(carriers, jobsCollection, usersCollection, carrierCollection, accessLogger) {
    let _this = this;
    _this._jobsCollection = jobsCollection;
    _this._usersCollection = usersCollection;
    _this._carrierCollection = carrierCollection;
    _this._accessLogger = accessLogger;
    _this._carriers = carriers;
    _this._jobsManagement = new JobsManagement(_this._carrierCollection, _this._jobsCollection, 5000);

    // Bind member functions
    _this.createNewJob = JobsController.prototype.createNewJob.bind(this);
    _this.createNewJobSwift = JobsController.prototype.createNewJobSwift.bind(this);
    _this.getJob = JobsController.prototype.getJob.bind(this);
    _this.getAllJobs = JobsController.prototype.getAllJobs.bind(this);
    _this.cancelJob = JobsController.prototype.cancelJob.bind(this);
    _this.getJobResults = JobsController.prototype.getJobResults.bind(this);
    _this.getJobResultsSwift = JobsController.prototype.getJobResultsSwift.bind(this);
}

/**
 * @fn createNewJob
 * @desc Create a job request. Sends back the list of carriers available for uploading the data.
 * @param req Incoming message
 * @param res Server Response
 */
JobsController.prototype.createNewJob = function(req, res){
    let _this = this;
    let eaeUsername = req.body.eaeUsername;
    let userToken = req.body.eaeUserToken;

    if (eaeUsername === null || eaeUsername === undefined || userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing username or token'));
        return;
    }
    try {
        // Check the validity of the JOB
        let jobRequest = JSON.parse(req.body.job);
        let requiredJobFields = ['type', 'main', 'params', 'input'];
        let terminateCreation = false;
        requiredJobFields.forEach(function(key){
            if(jobRequest[key] === null || jobRequest[key] === undefined){
                res.status(401);
                res.json(ErrorHelper('Job request is not well formed. Missing ' + jobRequest[key]));
                terminateCreation = true;
            }
            if(key === 'type'){
                let listOfSupportedComputations = [Constants.EAE_COMPUTE_TYPE_PYTHON2, Constants.EAE_COMPUTE_TYPE_R,
                    Constants.EAE_COMPUTE_TYPE_TENSORFLOW, Constants.EAE_COMPUTE_TYPE_SPARK];
                if(!(listOfSupportedComputations.includes(jobRequest[key]))) {
                    res.status(405);
                    res.json(ErrorHelper('The requested compute type is currently not supported. The list of supported computations: ' +
                        Constants.EAE_COMPUTE_TYPE_PYTHON2 + ', ' + Constants.EAE_COMPUTE_TYPE_SPARK + ', ' + Constants.EAE_COMPUTE_TYPE_R + ', ' +
                        Constants.EAE_COMPUTE_TYPE_TENSORFLOW));
                    terminateCreation = true;
                }
            }
        });
        // we cannot stop the foreach without throwing an error so it is a bad workaround
        if(terminateCreation) return;

        // Prevent the model from being updated
        let eaeJobModel = JSON.parse(JSON.stringify(DataModels.EAE_JOB_MODEL));
        let newJob = Object.assign({}, eaeJobModel, jobRequest, {_id: new ObjectID()});
        newJob.requester = eaeUsername;
        let filter = {
            username: eaeUsername,
            token: userToken
        };

        _this._usersCollection.findOne(filter).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }

            _this._jobsCollection.insertOne(newJob).then(function (_unused__result) {
                // We create a manifest for the carriers to work against
                _this._jobsManagement.createJobManifestForCarriers(newJob, newJob._id.toString()).then(function(_unused__result) {
                    res.status(200);
                    res.json({status: 'OK', jobID: newJob._id.toString(), carriers: _this._carriers});
                    // This will monitor the data transfer status
                    _this._jobsManagement.startJobMonitoring(newJob,  newJob._id.toString()).then(function (_unused__updated) {
                        // if(updated.updatedExisting)
                    }, function (error) {
                        ErrorHelper('Couldn\'t start the monitoring of the transfer', error);
                    });
                },function(error){
                    res.status(500);
                    res.json(ErrorHelper('Couldn\'t create the manifest for the carriers to transfer the files', error));
                });
            },function(error) {
                res.status(500);
                res.json(ErrorHelper('Internal Mongo Error', error));
            });
        },function(error){
            res.status(500);
            res.json(ErrorHelper('Internal Mongo Error', error));
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};


/**
 * @fn createNewJobSwift
 * @desc Create a job request. Sends back an acknowledgement of the request.
 * @param req Incoming message
 * @param res Server Response
 */
JobsController.prototype.createNewJobSwift = function(req, res){
    let _this = this;
    let eaeUsername = req.body.eaeUsername;
    let userToken = req.body.eaeUserToken;

    if (eaeUsername === null || eaeUsername === undefined || userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing username or token'));
        return;
    }
    try {
        // Check the validity of the JOB
        let jobRequest = JSON.parse(req.body.job);
        let requiredJobFields = ['type', 'main', 'params', 'swiftData'];
        let terminateCreation = false;
        requiredJobFields.forEach(function(key){
            if(jobRequest[key] === null || jobRequest[key] === undefined){
                res.status(401);
                res.json(ErrorHelper('Job request is not well formed. Missing ' + jobRequest[key]));
                terminateCreation = true;
            }
            if(key === 'type'){
                let listOfSupportedComputations = [Constants.EAE_COMPUTE_TYPE_PYTHON2, Constants.EAE_COMPUTE_TYPE_R,
                    Constants.EAE_COMPUTE_TYPE_TENSORFLOW, Constants.EAE_COMPUTE_TYPE_SPARK];
                if(!(listOfSupportedComputations.includes(jobRequest[key]))) {
                    res.status(405);
                    res.json(ErrorHelper('The requested compute type is currently not supported. The list of supported computations: ' +
                        Constants.EAE_COMPUTE_TYPE_PYTHON2 + ', ' + Constants.EAE_COMPUTE_TYPE_SPARK + ', ' + Constants.EAE_COMPUTE_TYPE_R + ', ' +
                        Constants.EAE_COMPUTE_TYPE_TENSORFLOW));
                    terminateCreation = true;
                }
            }
        });
        // we cannot stop the foreach without throwing an error so it is a bad workaround
        if(terminateCreation) return;

        // Prevent the model from being updated
        let eaeJobModel = JSON.parse(JSON.stringify(DataModels.EAE_JOB_MODEL));
        let newJob = Object.assign({}, eaeJobModel, jobRequest, {_id: new ObjectID()});
        newJob.requester = eaeUsername;
        let filter = {
            username: eaeUsername,
            token: userToken
        };

        _this._usersCollection.findOne(filter).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            // There is no data transfer so we can start the scheduling right away
            newJob.status.unshift(Constants.EAE_JOB_STATUS_QUEUED) ;
            _this._jobsCollection.insertOne(newJob).then(function (_unused__result) {
                    res.status(200);
                    res.json({status: 'OK', jobID: newJob._id.toString()});
            },function(error) {
                res.status(500);
                res.json(ErrorHelper('Internal Mongo Error', error));
            });
        },function(error){
            res.status(500);
            res.json(ErrorHelper('Internal Mongo Error', error));
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};


/**
 * @fn getJob
 * @desc Retrieve a specific job - Check that user requesting is owner of the job or Admin
 * @param req Incoming message
 * @param res Server Response
 */
JobsController.prototype.getJob = function(req, res){
    let _this = this;
    let eaeUsername = req.body.eaeUsername;
    let userToken = req.body.eaeUserToken;
    let jobID = req.body.jobID;

    if (eaeUsername === null || eaeUsername === undefined || userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing username or token'));
        return;
    }
    try {
        _this._jobsCollection.findOne({_id: ObjectID(jobID)}).then(function(job){
            if(job === null){
                res.status(401);
                res.json(ErrorHelper('The job request do not exit. The query has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }else{
                let filter = {
                    username: eaeUsername,
                    token: userToken
                };
                _this._usersCollection.findOne(filter).then(function (user) {
                    if (user === null) {
                        res.status(401);
                        res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                        // Log unauthorized access
                        _this._accessLogger.logIllegalAccess(req);
                        return;
                    }
                    if(user.type === interface_constants.USER_TYPE.admin || job.requester === user.username){
                        res.status(200);
                        res.json(job);
                    }else{
                        res.status(401);
                        res.json(ErrorHelper('The user is not authorized to access this job.'));
                        // Log unauthorized access
                        _this._accessLogger.logIllegalAccess(req);
                    }
                }, function (_unused__error) {
                    res.status(401);
                    res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                    // Log unauthorized access
                    _this._accessLogger.logIllegalAccess(req);
                });
            }}, function(error){
            res.status(500);
            res.json(ErrorHelper('Internal Mongo Error', error));
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn getAllJobs
 * @desc Retrieve all current jobs (e.g. all jobs which have not been archived) - Admin only
 * @param req Incoming message
 * @param res Server Response
 */
JobsController.prototype.getAllJobs = function(req, res){
    let _this = this;
    let eaeUsername = req.body.eaeUsername;
    let userToken = req.body.eaeUserToken;


    if (eaeUsername === null || eaeUsername === undefined || userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing username or token'));
        return;
    }
    try {
        let filter = {
            username: eaeUsername,
            token: userToken
        };

        _this._usersCollection.findOne(filter).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if(user.type === interface_constants.USER_TYPE.admin){
                _this._jobsCollection.find({}).toArray().then(function(allJobs) {
                    res.status(200);
                    res.json(allJobs);
                },function(error){
                    res.status(500);
                    res.json(ErrorHelper('Internal Mongo Error', error));
                });
            }else{
                res.status(401);
                res.json(ErrorHelper('The user is not authorized to access this job.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
            }
        }, function (_unused__error) {
            res.status(401);
            res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
            // Log unauthorized access
            _this._accessLogger.logIllegalAccess(req);
        });

    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn cancelJob
 * @desc Cancels a job. Check that user requesting is owner of the job or Admin
 * @param req Incoming message
 * @param res Server Response
 */
JobsController.prototype.cancelJob = function(req, res) {
    let _this = this;
    let eaeUsername = req.body.eaeUsername;
    let userToken = req.body.eaeUserToken;
    let jobID = req.body.jobID;


    if (eaeUsername === null || eaeUsername === undefined || userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing username or token'));
        return;
    }
    try{
        _this._jobsCollection.findOne({_id: ObjectID(jobID)}).then(function(job) {
                if (job === null) {
                    res.status(401);
                    res.json(ErrorHelper('The job request do not exit. The query has been logged.'));
                    // Log unauthorized access
                    _this._accessLogger.logIllegalAccess(req);
                    return;
                } else {
                    if(job.status[0] === Constants.EAE_JOB_STATUS_TRANSFERRING_DATA ||
                        job.status[0] === Constants.EAE_JOB_STATUS_QUEUED ||
                        job.status[0] === Constants.EAE_JOB_STATUS_SCHEDULED ||
                        job.status[0] === Constants.EAE_JOB_STATUS_RUNNING ||
                        job.status[0] === Constants.EAE_JOB_STATUS_ERROR
                    ){
                        let filter = {
                            username: eaeUsername,
                            token: userToken
                        };
                        _this._usersCollection.findOne(filter).then(function (user) {
                            if (user === null) {
                                res.status(401);
                                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                                // Log unauthorized access
                                _this._accessLogger.logIllegalAccess(req);
                                return;
                            }
                            if (user.type === interface_constants.USER_TYPE.admin || job.requester === user.username) {
                                _this._jobsManagement.cancelJob(job).then(function(resCancelledJob){
                                    res.status(200);
                                    res.json(Object.assign({}, {status: 'Job ' + jobID + ' has been successfully cancelled.'}, resCancelledJob));
                                },function(error){
                                    res.status(500);
                                    res.json(ErrorHelper('Internal server error', error));
                                });
                            }else{
                                res.status(401);
                                res.json(ErrorHelper('The user is not authorized to access this job.'));
                                // Log unauthorized access
                                _this._accessLogger.logIllegalAccess(req);
                            }
                        }, function (_unused__error) {
                            res.status(401);
                            res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                            // Log unauthorized access
                            _this._accessLogger.logIllegalAccess(req);
                        });
                    }else{
                        res.status(412);
                        res.json(ErrorHelper('The job requested cannot be cancelled because he is not pending, queued, ' +
                            'running or in error. Current status: ' + job.status[0]));
                    }
                }}
            , function(error){
                res.status(500);
                res.json(ErrorHelper('Internal Mongo Error', error));
            });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn getJobResults
 * @desc Retrieve the results for a specific job by sending back the carriers where they are available.
 * Check that user requesting is owner of the job or Admin
 * @param req Incoming message
 * @param res Server Response
 */
JobsController.prototype.getJobResults = function(req, res){
    let _this = this;
    let eaeUsername = req.body.eaeUsername;
    let userToken = req.body.eaeUserToken;
    let jobID = req.body.jobID;

    if (eaeUsername === null || eaeUsername === undefined || userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing username or token'));
        return;
    }
    try{
        _this._jobsCollection.findOne({_id: ObjectID(jobID)}).then(function(job){
            if(job === null){
                res.status(401);
                res.json(ErrorHelper('The job request do not exists. The query has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }else{
                if(job.status[0] === Constants.EAE_JOB_STATUS_COMPLETED){
                    let filter = {
                        username: eaeUsername,
                        token: userToken
                    };
                    _this._usersCollection.findOne(filter).then(function (user) {
                        if (user === null) {
                            res.status(401);
                            res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                            // Log unauthorized access
                            _this._accessLogger.logIllegalAccess(req);
                            return;
                        }
                        if(user.type === interface_constants.USER_TYPE.admin || job.requester === user.username){
                            _this._jobsManagement.createDownloadManifestForCarriers(job).then(function(outputFiles) {
                                res.status(200);
                                res.json({status: 'OK', carriers: _this._carriers, output: outputFiles});
                            });
                        }else{
                            res.status(401);
                            res.json(ErrorHelper('The user is not authorized to access this job.'));
                            // Log unauthorized access
                            _this._accessLogger.logIllegalAccess(req);
                        }
                    }, function (_unused__error) {
                        res.status(401);
                        res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                        // Log unauthorized access
                        _this._accessLogger.logIllegalAccess(req);
                    });
                }else{
                    res.status(412);
                    res.json(ErrorHelper('The job requested is not ready for collection. Current status: ' + job.status[0]));
                }
            }}
                , function(error){
                res.status(500);
                res.json(ErrorHelper('Internal Mongo Error', error));
            });

    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn getJobResultsSwift
 * @desc Retrieve the results for a specific job by sending back the location of the swift output container and list of files.
 * Check that user requesting is owner of the job or Admin
 * @param req Incoming message
 * @param res Server Response
 */
JobsController.prototype.getJobResultsSwift = function(req, res){
    let _this = this;
    let eaeUsername = req.body.eaeUsername;
    let userToken = req.body.eaeUserToken;
    let jobID = req.body.jobID;

    if (eaeUsername === null || eaeUsername === undefined || userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing username or token'));
        return;
    }
    try{
        _this._jobsCollection.findOne({_id: ObjectID(jobID)}).then(function(job){
                if(job === null){
                    res.status(401);
                    res.json(ErrorHelper('The job request do not exists. The query has been logged.'));
                    // Log unauthorized access
                    _this._accessLogger.logIllegalAccess(req);
                    return;
                }else{
                    if(job.status[0] === Constants.EAE_JOB_STATUS_COMPLETED){
                        let filter = {
                            username: eaeUsername,
                            token: userToken
                        };
                        _this._usersCollection.findOne(filter).then(function (user) {
                            if (user === null) {
                                res.status(401);
                                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                                // Log unauthorized access
                                _this._accessLogger.logIllegalAccess(req);
                                return;
                            }
                            if(user.type === interface_constants.USER_TYPE.admin || job.requester === user.username){
                                let outputSwiftContainer = job._id.toString() + '_output';
                                res.status(200);
                                res.json({status: 'OK', outputContainer: outputSwiftContainer, output: job.output,
                                    jobStatus: job.status, stdout: job.stdout, stderr: job.stderr, exitCode: job.exitCode});
                            }else{
                                res.status(401);
                                res.json(ErrorHelper('The user is not authorized to access this job.'));
                                // Log unauthorized access
                                _this._accessLogger.logIllegalAccess(req);
                            }
                        }, function (_unused__error) {
                            res.status(401);
                            res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                            // Log unauthorized access
                            _this._accessLogger.logIllegalAccess(req);
                        });
                    }else{
                        res.status(412);
                        res.json(ErrorHelper('The job requested is not ready for collection. Current status: ' + job.status[0]));
                    }
                }}
            , function(error){
                res.status(500);
                res.json(ErrorHelper('Internal Mongo Error', error));
            });

    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

module.exports = JobsController;
