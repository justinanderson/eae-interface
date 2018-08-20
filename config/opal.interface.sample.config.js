
module.exports = {
    mongoURL: 'mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]',
    port: 8080,
	enableCors: true,
    cacheURL: 'http://cache:8080',
    algoServiceURL: 'http://algoService:80',
    algorithmsDirectory: 'algorithms',
    auditDirectory: 'audit',
    bcryptSalt:'$2b$14$2uYOq0IOSU5PViie2W8HU.',
    ethereum: {
        enabled: true,
        url: 'http://ganache:8545',
        account: '0xe092b1fa25df5786d151246e492eed3d15ea4daa',
        password: '',
        gasPrice: 10,
        contract: {
            "abi": [
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "_hash",
                            "type": "uint256"
                        }
                    ],
                    "name": "log",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function",
                    "signature": "0xf82c50f1"
                },
                {
                    "inputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "constructor",
                    "signature": "constructor"
                },
                {
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": true,
                            "name": "hash",
                            "type": "uint256"
                        }
                    ],
                    "name": "Logged",
                    "type": "event",
                    "signature": "0x2adf2e2e5f5d116e0d0e1f0231d3f5b75916c3d37d9a16ce060f634cbcc61430"
                }
            ],
            "address": "0xE6042703475D0dd1bC2eB564a55F1832c2527171"
        }
    }

};
