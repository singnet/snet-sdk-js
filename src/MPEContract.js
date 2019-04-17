import MPEAbi from 'singularitynet-platform-contracts/abi/MultiPartyEscrow';
import MPENetworks from 'singularitynet-platform-contracts/networks/MultiPartyEscrow';
import { map } from 'lodash';

import PaymentChannel from './PaymentChannel';

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

  async channelAddFunds(channelId, amount) {
    const currentEscrowBalance = await this._account.escrowBalance();
    if(amount > currentEscrowBalance) {
      await this._account.depositToEscrowAccount(amount - currentEscrowBalance);
    }

    const channelAddFundsOperation = this.contract.methods.channelAddFunds(channelId, amount);
    return this._account.sendSignedTransaction(channelAddFundsOperation, this.address);
  }

  async channelExtend(channelId, expiration) {
    const channelExtendOperation = this.contract.methods.channelExtend(channelId, expiration);
    return this._account.sendSignedTransaction(channelExtendOperation, this.address);
  }

  async channelExtendAndAddFunds(channelId, expiration, amount) {
    const currentEscrowBalance = await this._account.escrowBalance();
    if(amount > currentEscrowBalance) {
      await this._account.depositToEscrowAccount(amount - currentEscrowBalance);
    }

    const channelExtendAndAddFundsOperation = this.contract.methods.channelExtendAndAddFunds(channelId, expiration, amount);
    return this._account.sendSignedTransaction(channelExtendAndAddFundsOperation, this.address);
  }

  async channels(channelId) {
    return this.contract.methods.channels(channelId).call();
  }

  async getPastOpenChannels(recipient, startingBlockNumber) {
    const fromBlock = startingBlockNumber ? startingBlockNumber : await this._deploymentBlockNumber();
    const options = {
      filter: {
        sender: this._account.address,
        recipient,
      },
      fromBlock,
      toBlock: 'latest'
    };
    const channelsOpened = await this.contract.getPastEvents('ChannelOpen', options);
    return map(channelsOpened, channel => new PaymentChannel(channel, this._web3, this._account, this));
  }

  async _deploymentBlockNumber() {
    const { transactionHash } = MPENetworks[this._config.networkId];
    const { blockNumber } = await this._web3.eth.getTransactionReceipt(transactionHash);
    return blockNumber;
  }
}
