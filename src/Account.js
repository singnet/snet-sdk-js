import AGITokenAbi from 'singularitynet-token-contracts/abi/SingularityNetToken';
import AGITokenNetworks from 'singularitynet-token-contracts/networks/SingularityNetToken';
import MPENetworks from 'singularitynet-platform-contracts/networks/MultiPartyEscrow';
import MPEAbi from 'singularitynet-platform-contracts/abi/MultiPartyEscrow';
import Tx from 'ethereumjs-tx';

export default class Account {
  constructor(web3, config) {
    this._web3 = web3;
    this._config = config;
    this._network = this._config.networkId;
    this._tokenContract = this._generateTokenContract();
    this._mpeContract = this._generateMPEContract();
  }

  async balance() {
    return this._getTokenContract().methods.balanceOf(this.address).call();
  }

  async escrowBalance() {
    return this._getMPEContract().methods.balances(this.address).call();
  }

  async depositToEscrowAccount(amountInCogs) {
    await this.approveTransfer(amountInCogs);
    return this._deposit(amountInCogs);
  }

  async approveTransfer(amountInCogs) {
    const approveOperation = this._getTokenContract().methods.approve(this._getMPEAddress(), amountInCogs);
    return this.sendSignedTransaction(approveOperation, this._getTokenContract().address);
  }

  async allowance() {
    return this._getTokenContract().methods.allowance(this.address, this._getMPEContract().address).call();
  }

  async withdrawFromEscrowAccount(amountInCogs) {
    const withdrawOperation = this._getMPEContract().methods.withdraw(amountInCogs);
    return this.sendSignedTransaction(withdrawOperation, this._getMPEContract().address);
  }

  get address() {
    return this._web3.eth.defaultAccount;
  }

  sign(message) {
    return this._web3.eth.accounts.sign(message, this._config.privateKey);
  }

  async sendSignedTransaction(operation, to) {
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
      receipt = await this._web3.eth.getTransactionReceipt(hash);
    }

    return new Promise((resolve, reject) => {
      if(!receipt.status) {
        reject(receipt);
      }

      resolve(receipt);
    });
  }

  _getMPEAddress() {
    return this._getMPEContract().address;
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
    return new this._web3.eth.Contract(MPEAbi, MPENetworks[this._network].address);
  }

  async _deposit(amountInCogs) {
    const depositOperation = this._getMPEContract().methods.deposit(amountInCogs);
    return this.sendSignedTransaction(depositOperation, this._getMPEContract().address);
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
      .catch(() => this._web3.eth.defaultGasPrice);
  }

  async _estimateGas(operation) {
    return operation
      .estimateGas()
      .then(estimatedGas => estimatedGas)
      .catch(() => this._web3.eth.defaultGas);
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
