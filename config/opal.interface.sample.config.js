
module.exports = {
    mongoURL: 'mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]',
    port: 8080,
	enableCors: true,
    cacheURL: 'http://cache:8080',
    algoServiceURL: 'http://algoService:80',
    algorithmsDirectory: 'algorithms',
    auditDirectory: 'audit',
    bcryptSalt:'$2b$14$2uYOq0IOSU5PViie2W8HU.'
};
