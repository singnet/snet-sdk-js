export default class PaymentChannel {
  constructor(channelOpenEvent, web3, account, mpeContract) {
    this._channelOpenEvent = channelOpenEvent;
    this._channelId = this._channelOpenEvent.returnValues.channelId;
  }

  get channelId() {
    return this._channelId;
  }
}
