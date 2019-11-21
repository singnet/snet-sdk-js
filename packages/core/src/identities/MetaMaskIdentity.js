import Eth from 'ethjs';

import logger from '../utils/logger';

/**
 * @implements Identity
 */
class MetaMaskIdentity {
  /**
   * @param {Config} config
   * @param {Web3} web3
   */
  constructor(config, web3) {
    this._eth = new Eth(config.web3Provider);
    this._web3 = web3;
    this._setupAccount();
  }

  get address() {
    return this._web3.eth.defaultAccount;
  }

  async signData(sha3Message) {
    return this._eth.personal_sign(sha3Message, this.address);
  }

  async sendTransaction(transactionObject) {
    return new Promise((resolve, reject) => {
      this._web3.eth.sendTransaction(transactionObject, (error, txHash) => {
        if (error) {
          logger.error(`Couldn't send transaction. ${error}`);
          reject(error);
        }
        resolve(txHash);
      });
    });
  }

  _setupAccount() {
    this._web3.eth.defaultAccount = window.web3.eth.defaultAccount;
  }
}

export default MetaMaskIdentity;
