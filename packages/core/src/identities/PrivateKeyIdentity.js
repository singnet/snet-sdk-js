import * as Tx from "@ethereumjs/tx";
import logger from "../utils/logger";
import blockChainEvents from "../utils/blockchainEvents";

/**
 * @implements Identity
 */
class PrivateKeyIdentity {
  /**
   * @param {Config} config
   * @param {Web3} web3
   */
  constructor(config, web3) {
    this._web3 = web3;
    this._pk = config.privateKey;
    console.log(this._pk)
    this._setupAccount();
  }

  get address() {
    return this._web3.eth.defaultAccount;
  }

  async getAddress() {
    return this._web3.eth.defaultAccount;
  }

  async signData(sha3Message) {
    const { signature } = this._web3.eth.accounts.sign(sha3Message, this._pk);
    return signature;
  }

  async sendTransaction(transactionObject) {
    const signedTransaction = this._signTransaction(transactionObject);
    return new Promise((resolve, reject) => {
      const method = this._web3.eth.sendSignedTransaction(signedTransaction);
      method.once(
        blockChainEvents.CONFIRMATION,
        async (_confirmationNumber, receipt) => {
          console.log("blockchain confirmation count", _confirmationNumber);
          console.log("blockchain confirmation receipt status", receipt.status);
          if (receipt.status) {
            resolve(receipt);
          } else {
            reject(receipt);
          }
          await method.off();
        }
      );
      method.on(blockChainEvents.ERROR, (error) => {
        console.log("blockchain error", error);
        reject(error);
      });
      method.once(blockChainEvents.TRANSACTION_HASH, (hash) => {
        console.log("waiting for blockchain txn", hash);
      });
      method.once(blockChainEvents.RECEIPT, (receipt) => {
        console.log("blockchain receipt", receipt.status);
      });
    });
  }

  _signTransaction(txObject) {
    const transaction = new Tx(txObject);
    const privateKey = Buffer.from(this._pk.slice(2), "hex");
    transaction.sign(privateKey);
    const serializedTransaction = transaction.serialize();
    return `0x${serializedTransaction.toString("hex")}`;
  }

  _setupAccount() {
    const account = this._web3.eth.accounts.privateKeyToAccount(this._pk);
    this._web3.eth.accounts.wallet.add(account);
    this._web3.eth.defaultAccount = account.address;
  }
}

export default PrivateKeyIdentity;