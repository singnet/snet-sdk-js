import MPEAbi from 'singularitynet-platform-contracts/abi/MultiPartyEscrow';
import MPENetworks from 'singularitynet-platform-contracts/networks/MultiPartyEscrow';
import { map } from 'lodash';

import PaymentChannel from './PaymentChannel';

export default class MPEContract {
  constructor(web3, config) {
    this._web3 = web3;
    this._config = config;
    this._contract = this._web3.eth.Contract(MPEAbi, MPENetworks[this._config.networkId].address);
  }

  get contract() {
    return this._contract;
  }

  get address() {
    return this.contract.address;
  }

  async openChannel(account, recipientAddress, groupId, amount, expiration) {
    const openChannelOperation = this.contract.methods.openChannel(account.signerAddress, recipientAddress, groupId, amount, expiration);
    return account.sendSignedTransaction(openChannelOperation, this.address);
  }

  async depositAndOpenChannel(account, recipientAddress, groupId, amount, expiration) {
    const alreadyApprovedAmount = await account.allowance();
    if(amount > alreadyApprovedAmount) {
      await account.approveTransfer(amount);
    }

    const depositAndOpenChannelOperation = this.contract.methods.depositAndOpenChannel(account.signerAddress, recipientAddress, groupId, amount, expiration);
    return account.sendSignedTransaction(depositAndOpenChannelOperation, this.address);
  }

  async channelAddFunds(account, channelId, amount) {
    const currentEscrowBalance = await account.escrowBalance();
    if(amount > currentEscrowBalance) {
      await account.depositToEscrowAccount(amount - currentEscrowBalance);
    }

    const channelAddFundsOperation = this.contract.methods.channelAddFunds(channelId, amount);
    return account.sendSignedTransaction(channelAddFundsOperation, this.address);
  }

  async channelExtend(account, channelId, expiration) {
    const channelExtendOperation = this.contract.methods.channelExtend(channelId, expiration);
    return account.sendSignedTransaction(channelExtendOperation, this.address);
  }

  async channelExtendAndAddFunds(account, channelId, expiration, amount) {
    const currentEscrowBalance = await account.escrowBalance();
    if(amount > currentEscrowBalance) {
      await account.depositToEscrowAccount(amount - currentEscrowBalance);
    }

    const channelExtendAndAddFundsOperation = this.contract.methods.channelExtendAndAddFunds(channelId, expiration, amount);
    return account.sendSignedTransaction(channelExtendAndAddFundsOperation, this.address);
  }

  async channels(channelId) {
    return this.contract.methods.channels(channelId).call();
  }

  async getPastOpenChannels(account, recipient, startingBlockNumber) {
    const fromBlock = startingBlockNumber ? startingBlockNumber : await this._deploymentBlockNumber();
    const options = {
      filter: {
        sender: account.address,
        recipient,
      },
      fromBlock,
      toBlock: 'latest'
    };
    const channelsOpened = await this.contract.getPastEvents('ChannelOpen', options);
    return map(channelsOpened, channel => new PaymentChannel(channel, this._web3, account, this));
  }

  async _deploymentBlockNumber() {
    const { transactionHash } = MPENetworks[this._config.networkId];
    const { blockNumber } = await this._web3.eth.getTransactionReceipt(transactionHash);
    return blockNumber;
  }
}
