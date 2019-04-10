import MPEAbi from 'singularitynet-platform-contracts/abi/MultiPartyEscrow';
import MPENetworks from 'singularitynet-platform-contracts/networks/MultiPartyEscrow';

export default class MPEContract {
  constructor(web3, account, config) {
    this._web3 = web3;
    this._account = account;
    this._config = config;
    this._contract = this._web3.eth.Contract(MPEAbi, MPENetworks[this._config.networkId].address);
  }

  get contract() {
    return this._contract;
  }

  get address() {
    return this.contract.address;
  }

  async openChannel(signerAddress, recipientAddress, groupId, amount, expiration) {
    const openChannelOperation = this.contract.methods.openChannel(signerAddress, recipientAddress, groupId, amount, expiration);
    return this._account.sendSignedTransaction(openChannelOperation, this.address);
  }

  async depositAndOpenChannel(signerAddress, recipientAddress, groupId, amount, expiration) {
    const alreadyApprovedAmount = await this._account.allowance();
    if(amount > alreadyApprovedAmount) {
      await this._account.approveTransfer(amount);
    }

    const depositAndOpenChannelOperation = this.contract.methods.depositAndOpenChannel(signerAddress, recipientAddress, groupId, amount, expiration);
    return this._account.sendSignedTransaction(depositAndOpenChannelOperation, this.address);
  }
}
