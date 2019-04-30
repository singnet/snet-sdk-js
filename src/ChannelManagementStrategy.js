import { find } from 'lodash';

export default class ChannelManagementStrategy {
  async selectChannel(serviceClient, sdk) {
    const account = sdk.account;
    const mpeContract = sdk.mpeContract;
    const paymentChannels = serviceClient.paymentChannels;
    const { payment_address: servicePaymentAddress, group_id: groupId } = serviceClient.group;
    const serviceCallPrice = serviceClient.metadata.pricing.price_in_cogs;
    const mpeBalance = await account.escrowBalance();
    const defaultExpiration = await serviceClient.defaultChannelExpiration();
    const groupIdBytes = Buffer.from(groupId, 'base64');

    if(paymentChannels.length === 0) {
      if(mpeBalance > serviceCallPrice) {
        const newChannelReceipt = await mpeContract.openChannel(account, servicePaymentAddress, groupIdBytes, serviceCallPrice, defaultExpiration);
        const openChannels = await mpeContract.getPastOpenChannels(account, servicePaymentAddress, newChannelReceipt.blockNumber);
        return openChannels[0];
      }

      const newfundedChannelReceipt = await mpeContract.depositAndOpenChannel(account, servicePaymentAddress, groupIdBytes, serviceCallPrice, defaultExpiration);
      const openChannels = await mpeContract.getPastOpenChannels(account, servicePaymentAddress, newfundedChannelReceipt.blockNumber);
      return openChannels[0];
    }

    const firstFundedValidChannel = find(paymentChannels, (paymentChanel) => paymentChanel.hasSufficientFunds(serviceCallPrice) && paymentChanel.isValid(defaultExpiration));
    if(firstFundedValidChannel) {
      return firstFundedValidChannel;
    }

    const firstFundedChannel = find(paymentChannels, (paymentChanel) => paymentChanel.hasSufficientFunds(serviceCallPrice));
    if(firstFundedChannel) {
      await firstFundedChannel.extendExpiration(defaultExpiration);
      return firstFundedChannel;
    }

    const firstValidChannel = find(paymentChannels, (paymentChanel) => paymentChanel.isValid(defaultExpiration));
    if(firstValidChannel) {
      await firstValidChannel.addFunds(serviceCallPrice);
      return firstValidChannel;
    }

    const firstExpiredAndUnfundedChannel = paymentChannels[0];
    await firstExpiredAndUnfundedChannel.extendAndAddFunds(defaultExpiration, serviceCallPrice);
    return firstExpiredAndUnfundedChannel;
  }
}
