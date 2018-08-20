const Web3 = require('web3');

/**
 * @fn EthereumLogger
 * @desc Service for logging hashes to Ethereum network
 * @param ethereumURL
 * @param ethereumAccount
 * @param ethereumPassword
 * @param contractABI
 * @param contractAddress
 * @param gasPrice
 * @constructor
 */
function EthereumLogger(ethereumURL, ethereumAccount, ethereumPassword, contractABI, contractAddress, gasPrice, enabled) {
    let _this = this;
    _this._url = ethereumURL;
    _this._account = ethereumAccount;
    _this._password = ethereumPassword;
    _this._contract = {
        abi: contractABI,
        address: contractAddress
    };
    _this._gasPrice = gasPrice;
    _this._enabled = enabled;
    if (_this._enabled) {
        // Open connection to Ethereum node
        _this.web3 = new Web3(_this._url);
        _this.web3.eth.defaultAccount = _this._account;
        // Ready Logger smart contract for use.
        // Note that this won't fail if the contract doesn't exist.
        _this._contract = new _this.web3.eth.Contract(_this._contract.abi, _this._contract.address);
    }

    // Bind member functions
    this.sha3 = EthereumLogger.prototype.sha3.bind(this);
    this.logHash = EthereumLogger.prototype.logHash.bind(this);

    // Bind private member functions
    this._unlockAccount = EthereumLogger.prototype._unlockAccount.bind(this);
}

/**
 * @fn sha3
 * @desc Method that takes a string and returns a 256-bit hash suitable for logging to Ethereum.
 * @param string The string to be hashed.
 */
EthereumLogger.prototype.sha3 = function (string) {
    let _this = this;
    return _this.web3.utils.sha3(string);
}

/**
 * @fn logHash
 * @desc Method that logs a 256-bit hash to a predefined smart contract on the Ethereum blockchain.
 * @param hash The 256-bit number to be logged. May be a string or number but must be convertible by web3.utils.toBN().
 */
EthereumLogger.prototype.logHash = function (hash) {
    let _this = this;
    if (!_this._enabled) {
        return;
    }
    _this._unlockAccount((result) => {
        // Convert to big number
        let value = _this.web3.utils.toBN(hash);
        // Actually send transaction to Ethereum network
        _this._contract.methods.log(value).send({
            from: _this.web3.eth.defaultAccount,
            // The Logger contract as originally written uses a maximum of 25070 gas per logged event. If it is rewritten to be more complex, this maximum of 30000 may need to be raised.
            gas: 3e4,
            gasPrice: _this._gasPrice
        }).on('error', (error) => {
            // Reasons for failure can include:
            // - Ethereum node unreachable
            // - Account and password incorrect
            // - Contract address incorrect
            // - Insufficient funds in wallet
            console.error(error);
        })
    })
}

/**
 * @fn _unlockAccount
 * @desc Method to temporarily unlock a secured Ethereum account for use in transactions.
 * @param callback Callback to execute once the account is unlocked.
 */
EthereumLogger.prototype._unlockAccount = function (callback) {
    let _this = this;
    _this.web3.eth.personal.unlockAccount(
        _this._account, _this._password, 60 // Unlocked for 60 seconds
    )
        .then(callback)
        .catch((error) => {
            console.error(`Failed to unlock Ethereum account "${_this._account}". Please verify url, account, and password in config.`);
            console.error(error, { depth: null });
        });
}


module.exports = EthereumLogger;
