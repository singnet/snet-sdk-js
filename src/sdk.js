import Web3 from 'web3';

import Account from './Account';

export const DEFAULT_GAS = 4700000;
export const DEFAULT_ESTIMATED_GAS_PRICE = 210000;

const { HttpProvider } = Web3.providers;
const providerHost = 'https://kovan.infura.io';
const httpProvider = new HttpProvider(providerHost);

export default class SnetSDK {
  constructor() {
    const options = {
      defaultGas: DEFAULT_GAS,
      defaultGasPrice: DEFAULT_ESTIMATED_GAS_PRICE,
    };
    const web3 = new Web3(httpProvider, null, options);
    const account = web3.eth.accounts.privateKeyToAccount(process.env.SNET_PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    this._web3 = web3;
    this._account = new Account(this._web3);
  }

  get account() {
    return this._account;
  }
}
