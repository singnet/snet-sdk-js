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
    this._setupAccount();
  }

  async getAddress() {
    const accounts = await web3Provider.request({method:ethereumMethods.REQUEST_ACCOUNTS})
    return accounts[0]
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
    const ethereum = window.ethereum
    console.log("ethereum", typeof ethereum !== 'undefined')
    console.log("ethereum", ethereum.isMetamask)
    if (typeof ethereum !== 'undefined') {
        this._web3.eth.defaultAccount = ethereum.selectedAddress
      // console.log('MetaMask is installed!');
    }else {
      logger.error("Metamask is not installed")
    }

    // this._web3.eth.defaultAccount = window.web3.eth.defaultAccount;
    // this._web3.eth.defaultAccount = this.config.web3Provider.selectedAddress
  }
}

export default MetaMaskIdentity;
