import AGITokenAbi from 'singularitynet-token-contracts/abi/SingularityNetToken';
import AGITokenNetworks from 'singularitynet-token-contracts/networks/SingularityNetToken';
import Tx from 'ethereumjs-tx';

export default class Account {
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

  async balance() {
    return this._getTokenContract().methods.balanceOf(this.address).call();
  }

  async escrowBalance() {
    return this._mpeContract.balance(this.address);
  }

  async depositToEscrowAccount(amountInCogs) {
    const alreadyApprovedAmount = await this.allowance();
    if(amountInCogs > alreadyApprovedAmount) {
      await this.approveTransfer(amountInCogs);
    }

    return this._mpeContract.deposit(this, amountInCogs);
  }

  async approveTransfer(amountInCogs) {
    const approveOperation = this._getTokenContract().methods.approve;
    return this.sendTransaction(this._getTokenContract().address, approveOperation, this._mpeContract.address, amountInCogs);
  }

  async allowance() {
    return this._getTokenContract().methods.allowance(this.address, this._mpeContract.address).call();
  }

  async withdrawFromEscrowAccount(amountInCogs) {
    return this._mpeContract.withdraw(this, amountInCogs);
  }

  get address() {
    return this._web3Account.address;
  }

  get signerAddress() {
    return this.address;
  }

  signedData(...data) {
    const sha3Message = this._web3.utils.soliditySha3(...data);
    const { signature } = this._web3.eth.accounts.sign(sha3Message, this._config.privateKey);
    const stripped = signature.substring(2, signature.length);
    const byteSig = Buffer.from(stripped, 'hex');
    return Buffer.from(byteSig);
  }

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
      receipt = await this._web3.eth.getTransactionReceipt(hash);
    }

    return new Promise((resolve, reject) => {
      if(!receipt.status) {
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
