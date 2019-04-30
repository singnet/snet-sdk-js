import paymentChannelStateMessages from './payment_channel_state_service_pb';

export default class PaymentChannel {
  constructor(channelOpenEvent, web3, account, mpeContract) {
    this._channelOpenEvent = channelOpenEvent;
    this._web3 = web3;
    this._account = account;
    this._mpeContract = mpeContract;
    this._channelId = this._channelOpenEvent.returnValues.channelId;
    this._state = {};
  }

  get channelId() {
    return this._channelId;
  }

  get nonce() {
    return this.state.nonce;
  }

  get lastSignedAmount() {
    return this.state.lastSignedAmount;
  }

  get state() {
    return this._state;
  }

  hasSufficientFunds(amount) {
    return this.state.availableAmount >= amount;
  }

  isValid(expiry) {
    return this.state.expiration > expiry;
  }

  async addFunds(amount) {
    return this._mpeContract.channelAddFunds(this._account, this.channelId, amount);
  }

  async extendExpiration(expiration) {
    return this._mpeContract.channelExtend(this._account, this.channelId, expiration);
  }

  async extendAndAddFunds(expiration, amount) {
    await this._mpeContract.channelExtendAndAddFunds(this._account, this.channelId, expiration, amount);
  }

  async syncState(paymentChannelStateService) {
    const latestChannelInfoOnBlockchain = await this._mpeContract.channels(this.channelId);
    const currentState = await this._currentChannelState(paymentChannelStateService);
    const { lastSignedAmount, nonce: currentNonce } = currentState;
    const { nonce, expiration, value: totalAmount } = latestChannelInfoOnBlockchain;
    const availableAmount = totalAmount - lastSignedAmount;
    this._state = {
      nonce,
      currentNonce,
      expiration,
      totalAmount,
      lastSignedAmount,
      availableAmount,
    };
    return this;
  }

  async _currentChannelState(paymentChannelStateService) {
    const sha3Message = this._web3.utils.soliditySha3({ t: 'uint256', v: this.channelId });
    const { signature } = this._account.sign(sha3Message);
    const stripped = signature.substring(2, signature.length);
    const byteSig = Buffer.from(stripped, 'hex');
    const signatureBytes = Buffer.from(byteSig);

    const channelIdBytes = Buffer.alloc(4);
    channelIdBytes.writeUInt32BE(this.channelId, 0);

    const channelStateRequest = new paymentChannelStateMessages.ChannelStateRequest();
    channelStateRequest.setChannelId(channelIdBytes);
    channelStateRequest.setSignature(signatureBytes);

    return new Promise((resolve, reject) => {
      paymentChannelStateService.getChannelState(channelStateRequest, (err, response) => {
        if(err) {
          reject(err);
        } else {
          const nonceBuffer = Buffer.from(response.getCurrentNonce());
          const nonce = nonceBuffer.readUInt32BE(28);
          const currentSignedAmountBuffer = Buffer.from(response.getCurrentSignedAmount());
          const currentSignedAmount = currentSignedAmountBuffer.length > 0 ? currentSignedAmountBuffer.readUInt32BE(28) : 0;
          const channelState = {
            lastSignedAmount: currentSignedAmount,
            nonce,
          };
          resolve(channelState);
        }
      });
    });
  }
}
