import grpc, { InterceptingCall } from "grpc";
import url from "url";
import { BigNumber } from 'bignumber.js';
import { find, map } from 'lodash';
import paymentChannelStateServices from './payment_channel_state_service_grpc_pb';

export default class ServiceClient {
  constructor(sdk, metadata, group, ServiceStub, paymentChannelManagementStrategy, options = {}) {
    this._sdk = sdk;
    this._options = options;
    this._metadata = metadata;
    this._group = group;
    this._paymentChannelManagementStrategy = paymentChannelManagementStrategy;
    this._grpcStub = this._generateGrpcStub(ServiceStub);
    this._paymentChannelStateServiceClient = this._generatePaymentChannelStateServiceClient();
    this._paymentChannels = [];
  }

  get stub() {
    return this._grpcStub;
  }

  get group() {
    return this._group;
  }

  get groupIdInBytes() {
    return Buffer.from(this.group.group_id, 'base64');
  }

  get paymentChannels() {
    return this._paymentChannels;
  }

  get metadata() {
    return this._metadata;
  }

  get paymentAddress() {
    return this.group.payment_address;
  }

  get paymentChannelStateServiceClient() {
    return this._paymentChannelStateServiceClient;
  }

  async loadOpenChannels() {
    const currentBlockNumber = await this._web3.eth.getBlockNumber();
    const newPaymentChannels = await this._mpeContract.getPastOpenChannels(this._account, this, this._lastReadBlock);
    this._paymentChannels = [...this._paymentChannels, ...newPaymentChannels];
    this._lastReadBlock = currentBlockNumber;
    return this._paymentChannels;
  }

  async updateChannelStates() {
    const currentChannelStatesPromise = map(this._paymentChannels, (paymentChannel) => {
      return paymentChannel.syncState();
    });
    await Promise.all(currentChannelStatesPromise);
    return this._paymentChannels;
  }

  async defaultChannelExpiration() {
    const currentBlockNumber = await this._web3.eth.getBlockNumber();
    return currentBlockNumber + this._expiryThreshold;
  }

  async openChannel(amount, expiration) {
    const newChannelReceipt = await this._mpeContract.openChannel(this._account, this, amount, expiration);
    return this._getNewlyOpenedChannel(newChannelReceipt);
  }

  async depositAndOpenChannel(amount, expiration) {
    const newFundedChannelReceipt = await this._mpeContract.depositAndOpenChannel(this._account, this, amount, expiration);
    return this._getNewlyOpenedChannel(newFundedChannelReceipt);
  }

  async _getNewlyOpenedChannel(receipt) {
    const openChannels = await this._mpeContract.getPastOpenChannels(this._account, this, receipt.blockNumber, this);
    return openChannels[0];
  }

  get _web3() {
    return this._sdk.web3;
  }

  get _account() {
    return this._sdk.account;
  }

  get _mpeContract() {
    return this._sdk.mpeContract;
  }

  _generateGrpcStub(ServiceStub) {
    const serviceEndpoint = this._getServiceEndpoint();
    const grpcChannelCredentials = this._getGrpcChannelCredentials(serviceEndpoint);
    const grpcOptions = this._generateGrpcOptions();
    return new ServiceStub(serviceEndpoint.host, grpcChannelCredentials, grpcOptions);
  }

  _generateGrpcOptions() {
    if (this._options.disableBlockchainOperations) {
      return {};
    }

    return {
      interceptors: [this._generateInterceptor()],
    };
  }

  get _pricePerServiceCall() {
    return new BigNumber(this._metadata.pricing.price_in_cogs);
  }

  get _expiryThreshold() {
    return this._metadata.payment_expiration_threshold;
  }

  _generateInterceptor() {
    return (options, nextCall) => {
      const requester = {
        start: async (metadata, listener, next) => {
          if (!this._paymentChannelManagementStrategy) {
            next(metadata, listener);
            return;
          }

          const channel = await this._paymentChannelManagementStrategy.selectChannel(this);

          const { channelId, nonce, lastSignedAmount } = channel;
          const signingAmount = lastSignedAmount.plus(this._pricePerServiceCall);

          const signatureBytes = this._account.signedData(
            { t: 'address', v: this._mpeContract.address },
            { t: 'uint256', v: channelId },
            { t: 'uint256', v: nonce },
            { t: 'uint256', v: signingAmount },
          );
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

  _generatePaymentChannelStateServiceClient() {
    const serviceEndpoint = this._getServiceEndpoint();
    const grpcChannelCredentials = this._getGrpcChannelCredentials(serviceEndpoint);
    return new paymentChannelStateServices.PaymentChannelStateServiceClient(serviceEndpoint.host, grpcChannelCredentials);
  }

  _getServiceEndpoint() {
    if (this._options.endpoint) {
      return (url.parse(this._options.endpoint));
    }

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
