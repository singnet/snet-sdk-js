import MPEAbi from 'singularitynet-platform-contracts/abi/MultiPartyEscrow';
import MPENetworks from 'singularitynet-platform-contracts/networks/MultiPartyEscrow';
import { map } from 'lodash';

import PaymentChannel from './PaymentChannel';

export default class MPEContract {
  constructor(web3, networkId) {
    this._web3 = web3;
    this._networkId = networkId;
    this._contract = this._web3.eth.Contract(MPEAbi, MPENetworks[networkId].address);
  }

  get contract() {
    return this._contract;
  }

  get address() {
    return this.contract.address;
  }

  async balance(address) {
    return this.contract.methods.balances(address).call()
  }

  async deposit(account, amountInCogs) {
    const depositOperation = this.contract.methods.deposit(amountInCogs);
    return account.sendSignedTransaction(depositOperation, this.address);
  }

  async withdraw(account, amountInCogs) {
    const withdrawOperation = this.contract.methods.withdraw(amountInCogs);
    return account.sendSignedTransaction(withdrawOperation, this.address);
  }

  async openChannel(account, service, amount, expiration) {
    const {
      paymentAddress: recipientAddress,
      groupIdInBytes: groupId
    } = service;

    const openChannelOperation = this.contract.methods.openChannel(account.signerAddress, recipientAddress, groupId, amount, expiration);
    return account.sendSignedTransaction(openChannelOperation, this.address);
  }

  async depositAndOpenChannel(account, service, amount, expiration) {
    const {
      paymentAddress: recipientAddress,
      groupIdInBytes: groupId
    } = service;
    const alreadyApprovedAmount = await account.allowance();
    if(amount > alreadyApprovedAmount) {
      await account.approveTransfer(amount);
    }

    const depositAndOpenChannelOperation = this.contract.methods.depositAndOpenChannel(account.signerAddress, recipientAddress, groupId, amount, expiration);
    return account.sendSignedTransaction(depositAndOpenChannelOperation, this.address);
  }

  async channelAddFunds(account, channelId, amount) {
    await this._fundEscrowAccount(account, amount);

    const channelAddFundsOperation = this.contract.methods.channelAddFunds(channelId, amount);
    return account.sendSignedTransaction(channelAddFundsOperation, this.address);
  }

  async channelExtend(account, channelId, expiration) {
    const channelExtendOperation = this.contract.methods.channelExtend(channelId, expiration);
    return account.sendSignedTransaction(channelExtendOperation, this.address);
  }

  async channelExtendAndAddFunds(account, channelId, expiration, amount) {
    await this._fundEscrowAccount(account, amount);

    const channelExtendAndAddFundsOperation = this.contract.methods.channelExtendAndAddFunds(channelId, expiration, amount);
    return account.sendSignedTransaction(channelExtendAndAddFundsOperation, this.address);
  }

  async channels(channelId) {
    return this.contract.methods.channels(channelId).call();
  }

  async getPastOpenChannels(account, service, startingBlockNumber) {
    const fromBlock = startingBlockNumber ? startingBlockNumber : await this._deploymentBlockNumber();
    const options = {
      filter: {
        sender: account.address,
        recipient: service.paymentAddress,
        groupId: service.groupIdInBytes,
      },
      fromBlock,
      toBlock: 'latest'
    };
    const channelsOpened = await this.contract.getPastEvents('ChannelOpen', options);
    return map(channelsOpened, channelOpenEvent => {
      const channelId = channelOpenEvent.returnValues.channelId;
      return new PaymentChannel(channelId, this._web3, account, service.paymentChannelStateServiceClient, this);
    });
  }

  async _fundEscrowAccount(account, amount) {
    const currentEscrowBalance = await this.balance(account.address);
    if(amount > currentEscrowBalance) {
      await account.depositToEscrowAccount(amount - currentEscrowBalance);
    }
  }

  async _deploymentBlockNumber() {
    const { transactionHash } = MPENetworks[this._networkId];
    const { blockNumber } = await this._web3.eth.getTransactionReceipt(transactionHash);
    return blockNumber;
  }
}
