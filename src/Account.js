import AGITokenAbi from 'singularitynet-token-contracts/abi/SingularityNetToken';
import AGITokenNetworks from 'singularitynet-token-contracts/networks/SingularityNetToken';
import MPENetworks from 'singularitynet-platform-contracts/networks/MultiPartyEscrow';
import MPEAbi from 'singularitynet-platform-contracts/abi/MultiPartyEscrow';
import BigNumber from 'bignumber.js';
import Tx from 'ethereumjs-tx';

export default class Account {
  constructor(web3) {
    this._web3 = web3;
    this._network = 42;
    this._privateKey = Buffer.from(process.env.SNET_RAW_PRIVATE_KEY, 'hex');
    this._tokenContract = this._generateTokenContract();
    this._mpeContract = this._generateMPEContract();
  }

  async balance() {
    return this._getTokenContract().methods.balanceOf(this._getAddress())
      .call()
      .then(balanceInCogs => (balanceInCogs / 100000000).toFixed(8));
  }

  async escrowBalance() {
    return this._getMPEContract().methods.balances(this._getAddress())
      .call()
      .then(balanceInCogs => (balanceInCogs / 100000000).toFixed(8));
  }

  async withdrawFromEscrowAccount(agiTokens) {
    const amountInCogs = new BigNumber(this._web3.utils.toWei(agiTokens, 'ether') / (10 ** (10))).toNumber();
    const withdrawOperation = this._getMPEContract().methods.withdraw(amountInCogs);
    const gas = await this._getGas(withdrawOperation);
    const nonce = await this._transactionCount();
    const txObject = {
      nonce,
      gasLimit: gas.gasLimit,
      gasPrice: this._web3.utils.toHex(gas.gasPrice),
      to: this._getMPEAddress(),
      data: withdrawOperation.encodeABI(),
    };
    const signedTransaction = this._signTransaction(txObject);

    return this._web3.eth.sendSignedTransaction(signedTransaction);
  }

  _getAddress() {
    return this._web3.eth.defaultAccount;
  }

  _getMPEAddress() {
    return MPENetworks[this._network].address;
  }

  _getTokenContract() {
    return this._tokenContract;
  }

  _getMPEContract() {
    return this._mpeContract;
  }

  _generateTokenContract() {
    return new this._web3.eth.Contract(AGITokenAbi, AGITokenNetworks[this._network].address);
  }

  _generateMPEContract() {
    return new this._web3.eth.Contract(MPEAbi, this._getMPEAddress());
  }

  async _getGas(operation) {
    const gasPrice = await this._getGasPrice();
    const estimatedGas = await this._estimateGas(operation);
    return { gasLimit: estimatedGas, gasPrice };
  }

  async _getGasPrice() {
    return this._web3.eth.getGasPrice()
      .then(gasPrice => gasPrice)
      .catch(() => this._web3.eth.defaultGas);
  }

  async _estimateGas(operation) {
    return operation
      .estimateGas()
      .then(estimatedGas => estimatedGas)
      .catch(() => this._web3.eth.defaultGasPrice);
  }

  async _transactionCount() {
    return this._web3.eth.getTransactionCount(this._getAddress());
  }

  _signTransaction(txObject) {
    const transaction = new Tx(txObject);
    transaction.sign(this._privateKey);
    const serializedTransaction = transaction.serialize();
    return `0x${serializedTransaction.toString('hex')}`;
  }
}
