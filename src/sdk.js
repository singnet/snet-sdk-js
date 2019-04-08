import Web3 from 'web3';

import Account from './Account';

const { HttpProvider } = Web3.providers;

export default class SnetSDK {
  constructor(config) {
    this._config = config;
    const options = {
      defaultGas: this._config.defaultGasLimit,
      defaultGasPrice: this._config.defaultGasPrice,
    };
    this._networkId = config.networkId;
    const httpProvider = new HttpProvider(config.web3Provider);
    const web3 = new Web3(httpProvider, null, options);
    const account = web3.eth.accounts.privateKeyToAccount(config.privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    this._web3 = web3;
    this._account = new Account(this._web3, this._config);
  }

  get account() {
    return this._account;
  }
}
