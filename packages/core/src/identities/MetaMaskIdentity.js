import Eth from 'ethjs';
import { ethereumMethods } from '../utils/ethereumUtils';

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
    this.setupAccount();
  }

  async getAddress() {
    const ethereum = window.ethereum
    const accounts = await ethereum.request({method:ethereumMethods.REQUEST_ACCOUNTS})
    return accounts[0]
  }

  async signData(sha3Message) {
    const address = await this.getAddress()
    return this._eth.personal_sign(sha3Message, address);
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

  async setupAccount() {
    const ethereum = window.ethereum
    if (typeof ethereum !== 'undefined') {
        const accounts = await ethereum.request({method:ethereumMethods.REQUEST_ACCOUNTS})
        this._web3.eth.defaultAccount = accounts[0]
    }else {
      logger.error("Metamask is not installed")
    }

  }
}

export default MetaMaskIdentity;
