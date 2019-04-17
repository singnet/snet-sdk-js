import { find } from 'lodash';

export default class ChannelManagementStrategy {
  constructor(web3, account, config, mpeContract) {
    this._web3 = web3;
    this._account = account;
    this._config = config;
    this._mpeContract = mpeContract;
  }

  async selectChannel(paymentChannels, servicePaymentAddress, groupId, serviceCallPrice, expiryThreshold) {
    const mpeBalance = await this._account.escrowBalance();
    const defaultExpiration = await this._getDefaultChannelExpiration(expiryThreshold);
    const groupIdBytes = Buffer.from(groupId, 'base64');

    if(paymentChannels.length === 0) {
      if(mpeBalance > serviceCallPrice) {
        const newChannelReceipt = await this._mpeContract.openChannel(this._account, servicePaymentAddress, groupIdBytes, serviceCallPrice, defaultExpiration);
        const openChannels = await this._mpeContract.getPastOpenChannels(this._account, servicePaymentAddress, newChannelReceipt.blockNumber);
        return openChannels[0];
      }

      const newfundedChannelReceipt = await this._mpeContract.depositAndOpenChannel(this._account, servicePaymentAddress, groupIdBytes, serviceCallPrice, defaultExpiration);
      const openChannels = await this._mpeContract.getPastOpenChannels(this._account, servicePaymentAddress, newfundedChannelReceipt.blockNumber);
      return openChannels[0];
    }

    const firstFundedValidChannel = find(paymentChannels, (paymentChanel) => paymentChanel.hasSufficientFunds(serviceCallPrice) && paymentChanel.isValid(defaultExpiration));
    if(firstFundedValidChannel) {
      return firstFundedValidChannel;
    }

    const firstFundedChannel = find(paymentChannels, (paymentChanel) => paymentChanel.hasSufficientFunds(serviceCallPrice));
    if(firstFundedChannel) {
      await this._mpeContract.channelExtend(this._account, firstFundedChannel.channelId, defaultExpiration);
      return firstFundedChannel;
    }

    const firstValidChannel = find(paymentChannels, (paymentChanel) => paymentChanel.isValid(defaultExpiration));
    if(firstValidChannel) {
      await this._mpeContract.channelAddFunds(this._account, firstValidChannel.channelId, serviceCallPrice);
      return firstValidChannel;
    }

    await this._mpeContract.channelExtendAndAddFunds(this._account, paymentChannels[0].channelId, defaultExpiration, serviceCallPrice);
    return paymentChannels[0];
  }

  async _getDefaultChannelExpiration(expiryThreshold) {
    const currentBlockNumber = await this._web3.eth.getBlockNumber();
    return currentBlockNumber + expiryThreshold + this._config.blockOffset;
  }
}
