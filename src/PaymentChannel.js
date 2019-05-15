import BigNumber from 'bignumber.js';

import paymentChannelStateMessages from './payment_channel_state_service_pb';

export default class PaymentChannel {
  constructor(channelId, web3, account, service, mpeContract) {
    this._channelId = channelId;
    this._web3 = web3;
    this._account = account;
    this._mpeContract = mpeContract;
    this._paymentChannelStateServiceClient = service.paymentChannelStateServiceClient;
    this._state = {
      nonce: new BigNumber(0),
      lastSignedAmount: new BigNumber(0),
    };
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

  async addFunds(amount) {
    return this._mpeContract.channelAddFunds(this._account, this.channelId, amount);
  }

  async extendExpiration(expiration) {
    return this._mpeContract.channelExtend(this._account, this.channelId, expiration);
  }

  async extendAndAddFunds(expiration, amount) {
    return this._mpeContract.channelExtendAndAddFunds(this._account, this.channelId, expiration, amount);
  }

  async syncState() {
    const latestChannelInfoOnBlockchain = await this._mpeContract.channels(this.channelId);
    const currentState = await this._currentChannelState();
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

  async _currentChannelState() {
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
      this._paymentChannelStateServiceClient.getChannelState(channelStateRequest, (err, response) => {
        if(err) {
          reject(err);
        } else {
          const nonce = this._uint8ArrayToBN(response.getCurrentNonce());
          const currentSignedAmount = this._uint8ArrayToBN(response.getCurrentSignedAmount());
          const channelState = {
            lastSignedAmount: currentSignedAmount,
            nonce,
          };
          resolve(channelState);
        }
      });
    });
  }

  _uint8ArrayToBN(uint8Array) {
    const buffer = Buffer.from(uint8Array);
    const hex = `0x${buffer.toString('hex')}`;
    return new BigNumber(hex);
  }
}
