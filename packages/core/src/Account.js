import AGITokenAbi from 'singularitynet-token-contracts/abi/SingularityNetToken';
import AGITokenNetworks from 'singularitynet-token-contracts/networks/SingularityNetToken';
import Tx from 'ethereumjs-tx';
import logger from './utils/logger';

class Account {
  /**
   * @param {Web3} web3
   * @param {number} networkId
   * @param {Config} config
   * @param {MPEContract} mpeContract
   */
  constructor(web3, networkId, config, mpeContract) {
    const account = web3.eth.accounts.privateKeyToAccount(config.privateKey);
    web3.eth.accounts.wallet.add(account);
    this._web3Account = account;
    this._web3 = web3;
    this._config = config;
    this._networkId = networkId;
    this._tokenContract = this._generateTokenContract();
    this._mpeContract = mpeContract;
  }

  /**
   * Returns the token balance available.
   * @returns {Promise.<BigNumber>}
   */
  async balance() {
    logger.debug('Fetching account balance', { tags: ['Account'] });
    return this._getTokenContract().methods.balanceOf(this.address).call();
  }

  /**
   * Returns the balance for the current account in MPE Account.
   * @returns {Promise.<BigNumber>}
   */
  async escrowBalance() {
    return this._mpeContract.balance(this.address);
  }

  /**
   * Approves the specified number of tokens for transfer if not already approved and deposits the tokens to the MPE Account.
   * @param {BigNumber} amountInCogs - Tokens to transfer to MPE Account
   * @returns {Promise.<TransactionReceipt>}
   */
  async depositToEscrowAccount(amountInCogs) {
    const alreadyApprovedAmount = await this.allowance();
    if(amountInCogs > alreadyApprovedAmount) {
      await this.approveTransfer(amountInCogs);
    }

    return this._mpeContract.deposit(this, amountInCogs);
  }

  /**
   * Approves the specified tokens for transfer to MPE Account
   * @param {BigNumber} amountInCogs - Tokens for approval.
   * @returns {Promise.<TransactionReceipt>}
   */
  async approveTransfer(amountInCogs) {
    logger.info(`Approving ${amountInCogs}cogs transfer to MPE address`, { tags: ['Account'] });
    const approveOperation = this._getTokenContract().methods.approve;
    return this.sendTransaction(this._getTokenContract().address, approveOperation, this._mpeContract.address, amountInCogs);
  }

  /**
   * Returns the already approved tokens for transfer to MPE Account.
   * @returns {Promise.<BigNumber>}
   */
  async allowance() {
    logger.debug(`Fetching already approved allowance`, { tags: ['Account'] });
    return this._getTokenContract().methods.allowance(this.address, this._mpeContract.address).call();
  }

  /**
   * Withdraws the specified tokens from the MPE account.
   * @param {BigNumber} amountInCogs - Tokens to be withdrawn from the escrow account.
   * @returns {Promise.<TransactionReceipt>}
   */
  async withdrawFromEscrowAccount(amountInCogs) {
    return this._mpeContract.withdraw(this, amountInCogs);
  }

  /**
   * @type {string}
   */
  get address() {
    return this._web3Account.address;
  }

  /**
   * @type {string}
   */
  get signerAddress() {
    return this.address;
  }

  /**
   * @param {...(*|Object)} data
   * @param {string} data.(t|type) - Type of data. One of the following (string|uint256|int256|bool|bytes)
   * @param {string} data.(v|value) - Value
   * @returns {Buffer} - Signed binary data
   * @see {@link https://web3js.readthedocs.io/en/1.0/web3-utils.html#soliditysha3|data}
   */
  signedData(...data) {
    const sha3Message = this._web3.utils.soliditySha3(...data);
    const { signature } = this._web3.eth.accounts.sign(sha3Message, this._config.privateKey);
    const stripped = signature.substring(2, signature.length);
    const byteSig = Buffer.from(stripped, 'hex');
    return Buffer.from(byteSig);
  }

  /**
   * Sends a transaction for the transaction object to the contract address
   * @param {string} to - The contract address to send the signed transaction to
   * @param {function} contractFn - The contract function for which the transaction needs to be sent
   * @param {...any} contractFnArgs - The args which will be sent to the contract function
   * @returns {Promise<TransactionReceipt>}
   */
  async sendTransaction(to, contractFn, ...contractFnArgs) {
    return this._sendSignedTransaction(to, contractFn, ...contractFnArgs);
  }

  async _sendSignedTransaction(to, contractFn, ...contractFnArgs) {
    const operation = contractFn(...contractFnArgs);
    const txObject = await this._baseTransactionObject(operation, to);
    const signedTransaction = this._signTransaction(txObject);
    return new Promise((resolve, reject) => {
      this._web3.eth.sendSignedTransaction(signedTransaction, (error, txHash) => {
        this._waitForTransaction(txHash).then(resolve).catch(reject);
      });
    });
  }

  async _waitForTransaction(hash) {
    let receipt;
    while(!receipt) {
      // eslint-disable-next-line no-await-in-loop
      try {
        receipt = await this._web3.eth.getTransactionReceipt(hash);
      } catch(error) {
        logger.error(`Couldn't complete transaction for: ${hash}. ${error}`);
      }
    }

    return new Promise((resolve, reject) => {
      if(!receipt.status) {
        logger.error(`Transaction failed. ${receipt}`);
        reject(receipt);
      }

      resolve(receipt);
    });
  }

  _getTokenContract() {
    return this._tokenContract;
  }

  _generateTokenContract() {
    return new this._web3.eth.Contract(AGITokenAbi, AGITokenNetworks[this._networkId].address);
  }

  async _baseTransactionObject(operation, to) {
    const { gasLimit, gasPrice } = await this._getGas(operation);
    const nonce = await this._transactionCount();
    return {
      nonce: this._web3.utils.toHex(nonce),
      gas: this._web3.utils.toHex(gasLimit),
      gasPrice: this._web3.utils.toHex(gasPrice),
      to,
      data: operation.encodeABI(),
    };
  }

  async _getGas(operation) {
    const gasPrice = await this._getGasPrice();
    const estimatedGas = await this._estimateGas(operation);
    return { gasLimit: estimatedGas, gasPrice };
  }

  async _getGasPrice() {
    return this._web3.eth.getGasPrice()
      .then(gasPrice => gasPrice)
      .catch((error) => this._web3.eth.defaultGasPrice);
  }

  async _estimateGas(operation) {
    return operation
      .estimateGas()
      .then(estimatedGas => estimatedGas)
      .catch((error) => this._web3.eth.defaultGas);
  }

  async _transactionCount() {
    return this._web3.eth.getTransactionCount(this.address);
  }

  _signTransaction(txObject) {
    const transaction = new Tx(txObject);
    const privateKey = Buffer.from(this._config.privateKey.slice(2), 'hex');
    transaction.sign(privateKey);
    const serializedTransaction = transaction.serialize();
    return `0x${serializedTransaction.toString('hex')}`;
  }
}

export default Account;
