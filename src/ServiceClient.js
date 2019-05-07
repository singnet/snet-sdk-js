import grpc, { InterceptingCall } from "grpc";
import url from "url";
import { BigNumber } from 'bignumber.js';
import { find, map } from 'lodash';
import paymentChannelStateServices from './payment_channel_state_service_grpc_pb';

export default class ServiceClient {
  constructor(sdk, metadata, group, ServiceStub, paymentChannelManagementStrategy) {
    this._sdk = sdk;
    this._web3 = this._sdk.web3;
    this._account = this._sdk.account;
    this._mpeContract = this._sdk.mpeContract;
    this._metadata = metadata;
    this._group = group;
    this._grpcStub = this._generateGrpcStub(ServiceStub, paymentChannelManagementStrategy);
    this._paymentChannelStateServiceClient = this._generatePaymentChannelStateServiceClient();
    this._paymentChannels = [];
  }

  get stub() {
    return this._grpcStub;
  }

  get group() {
    return this._group;
  }

  get paymentChannels() {
    return this._paymentChannels;
  }

  get metadata() {
    return this._metadata;
  }

  async defaultChannelExpiration() {
    const currentBlockNumber = await this._web3.eth.getBlockNumber();
    return currentBlockNumber + this._expiryThreshold + this._sdk.blockOffset;
  }

  async openChannel(amount, expiration) {
    const newChannelReceipt = await this._mpeContract.openChannel(this._account, this._paymentAddress, this._groupIdInBytes, amount, expiration);
    return this._getNewlyOpenedChannel(newChannelReceipt);
  }

  async depositAndOpenChannel(amount, expiration) {
    const newFundedChannelReceipt = await this._mpeContract.depositAndOpenChannel(this._account, this._paymentAddress, this._groupIdInBytes, amount, expiration);
    return this._getNewlyOpenedChannel(newFundedChannelReceipt);
  }

  async _getNewlyOpenedChannel(receipt) {
    const openChannels = await this._mpeContract.getPastOpenChannels(this._account, this._paymentAddress, this._groupIdInBytes, receipt.blockNumber);
    return openChannels[0];
  }

  get _groupIdInBytes() {
    return Buffer.from(this.group.group_id, 'base64');
  }

  _generateGrpcStub(ServiceStub, paymentChannelManagementStrategy) {
    const grpcOptions = {
      interceptors: [this._generateInterceptor(paymentChannelManagementStrategy)],
    };

    const serviceEndpoint = this._getServiceEndpoint();
    const grpcChannelCredentials = this._getGrpcChannelCredentials(serviceEndpoint);
    return new ServiceStub(serviceEndpoint.host, grpcChannelCredentials, grpcOptions);
  }

  get _paymentAddress() {
    return this.group.payment_address;
  }

  get _pricePerServiceCall() {
    return new BigNumber(this._metadata.pricing.price_in_cogs);
  }

  get _expiryThreshold() {
    return this._metadata.payment_expiration_threshold;
  }

  _generateInterceptor(paymentChannelManagementStrategy) {
    return (options, nextCall) => {
      const requester = {
        start: async (metadata, listener, next) => {
          const channel = await this._getFundedChannel(paymentChannelManagementStrategy);

          const { channelId, nonce, lastSignedAmount } = channel;
          const signingAmount = lastSignedAmount.plus(this._pricePerServiceCall);
          const sha3Message = this._web3.utils.soliditySha3(
            { t: 'address', v: this._mpeContract.address },
            { t: 'uint256', v: channelId },
            { t: 'uint256', v: nonce },
            { t: 'uint256', v: signingAmount },
          );
          const { signature } = this._account.sign(sha3Message);
          const stripped = signature.substring(2, signature.length);
          const byteSig = Buffer.from(stripped, 'hex');
          const signatureBytes = Buffer.from(byteSig);

          metadata.add('snet-payment-type', 'escrow');
          metadata.add('snet-payment-channel-id', `${channelId}`);
          metadata.add('snet-payment-channel-nonce', `${nonce}`);
          metadata.add('snet-payment-channel-amount', `${signingAmount}`);
          metadata.add('snet-payment-channel-signature-bin', signatureBytes);
          next(metadata, listener);
        },
      };
      return new InterceptingCall(nextCall(options), requester);
    };
  }

  async _getFundedChannel(paymentChannelManagementStrategy) {
    const currentBlockNumber = await this._web3.eth.getBlockNumber();
    const newPaymentChannels = await this._mpeContract.getPastOpenChannels(this._account, this._paymentAddress, this._groupIdInBytes, this._lastReadBlock);
    this._paymentChannels = [...this._paymentChannels, ...newPaymentChannels];
    this._lastReadBlock = currentBlockNumber;

    await this._updateChannelStates();
    return paymentChannelManagementStrategy.selectChannel(this);
  }

  async _updateChannelStates() {
    const currentChannelStatesPromise = map(this._paymentChannels, (paymentChannel) => {
      return paymentChannel.syncState(this._paymentChannelStateServiceClient);
    });
    await Promise.all(currentChannelStatesPromise);
  }

  _generatePaymentChannelStateServiceClient() {
    const serviceEndpoint = this._getServiceEndpoint();
    const grpcChannelCredentials = this._getGrpcChannelCredentials(serviceEndpoint);
    return new paymentChannelStateServices.PaymentChannelStateServiceClient(serviceEndpoint.host, grpcChannelCredentials);
  }

  _getServiceEndpoint() {
    const { group_name: defaultGroupName } = this.group;
    const { endpoints } = this._metadata;
    const { endpoint } = find(endpoints, ({ group_name: groupName }) => groupName === defaultGroupName);
    return endpoint && url.parse(endpoint);
  }

  _getGrpcChannelCredentials(serviceEndpoint) {
    if(serviceEndpoint.protocol === 'https:') {
      return grpc.credentials.createSsl();
    }

    if(serviceEndpoint.protocol === 'http:') {
      return grpc.credentials.createInsecure();
    }

    throw new Error(`Protocol: ${serviceEndpoint.protocol} not supported`);
  }
}
