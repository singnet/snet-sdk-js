import { find } from 'lodash';

export default class DefaultPaymentChannelManagementStrategy {
  constructor(sdkContext, blockOffset = 0, callAllowance = 1) {
    this._sdkContext = sdkContext;
    this._blockOffset = blockOffset;
    this._callAllowance = callAllowance;
  }

  async selectChannel(serviceClient) {
    const account = this._sdkContext.account;
    await serviceClient.loadOpenChannels();
    await serviceClient.updateChannelStates();
    const paymentChannels = serviceClient.paymentChannels;
    const serviceCallPrice = serviceClient.metadata.pricing.price_in_cogs * this._callAllowance;
    const mpeBalance = await account.escrowBalance();
    const defaultExpiration = await this._defaultChannelExpiration(serviceClient);

    if(paymentChannels.length === 0) {
      if(mpeBalance >= serviceCallPrice) {
        return serviceClient.openChannel(serviceCallPrice, defaultExpiration);
      }

      return serviceClient.depositAndOpenChannel(serviceCallPrice, defaultExpiration);
    }

    const firstFundedValidChannel = find(paymentChannels, (paymentChanel) => this._hasSufficientFunds(paymentChanel, serviceCallPrice) && this._isValid(paymentChanel, defaultExpiration));
    if(firstFundedValidChannel) {
      return firstFundedValidChannel;
    }

    const firstFundedChannel = find(paymentChannels, (paymentChanel) => this._hasSufficientFunds(paymentChanel, serviceCallPrice));
    if(firstFundedChannel) {
      await firstFundedChannel.extendExpiration(defaultExpiration);
      return firstFundedChannel;
    }

    const firstValidChannel = find(paymentChannels, (paymentChanel) => this._isValid(paymentChanel, defaultExpiration));
    if(firstValidChannel) {
      await firstValidChannel.addFunds(serviceCallPrice);
      return firstValidChannel;
    }

    const firstExpiredAndUnfundedChannel = paymentChannels[0];
    await firstExpiredAndUnfundedChannel.extendAndAddFunds(defaultExpiration, serviceCallPrice);
    return firstExpiredAndUnfundedChannel;
  }

  _hasSufficientFunds(paymentChannel, amount) {
    return paymentChannel.state.availableAmount >= amount;
  }

  _isValid(paymentChannel, expiry) {
    return paymentChannel.state.expiration > expiry
  }

  async _defaultChannelExpiration(serviceClient) {
    const currentBlockNumber = await this._sdkContext.web3.eth.getBlockNumber();
    return currentBlockNumber + serviceClient.metadata.payment_expiration_threshold + this._blockOffset;
  }
}
