import grpc, { InterceptingCall } from "grpc";
import url from "url";
import { find, map } from 'lodash';
import paymentChannelStateServices from './payment_channel_state_service_grpc_pb';

export default class ServiceClient {
  constructor(metadata, web3, account, mpeContract, ServiceStub, channelManagementStrategy) {
    this._metadata = metadata;
    this._web3 = web3;
    this._account = account;
    this._mpeContract = mpeContract;
    this._grpcStub = this._generateGrpcStub(ServiceStub, channelManagementStrategy);
    this._paymentChannelStateServiceClient = this._generatePaymentChannelStateServiceClient();
    this._paymentChannels = [];
  }

  get stub() {
    return this._grpcStub;
  }

  _generateGrpcStub(ServiceStub, channelManagementStrategy) {
    const grpcOptions = {
      interceptors: [this._generateInterceptor(channelManagementStrategy)],
    };

    const serviceEndpoint = this._getServiceEndpoint();
    const grpcChannel = this._getGrpcChannel(serviceEndpoint);
    return new ServiceStub(serviceEndpoint.host, grpcChannel, grpcOptions);
  }

  get _paymentAddress() {
    const defaultGroup = this._metadata.groups[0];
    return defaultGroup.payment_address;
  }

  get _pricePerServiceCall() {
    return this._metadata.pricing.price_in_cogs;
  }

  get _expiryThreshold() {
    return this._metadata.payment_expiration_threshold;
  }

  _generateInterceptor(channelManagementStrategy) {
    return (options, nextCall) => {
      const requester = {
        start: async (metadata, listener, next) => {
          const channel = await this._getFundedChannel(channelManagementStrategy);

          const { channelId, nonce, lastSignedAmount } = channel;
          const signingAmount = lastSignedAmount + this._pricePerServiceCall;
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

  async _getFundedChannel(channelManagementStrategy) {
    const currentBlockNumber = await this._web3.eth.getBlockNumber();
    const defaultGroup = this._metadata.groups[0];
    const { payment_address: servicePaymentAddress, group_id: groupId } = defaultGroup;
    const newPaymentChannels = await this._mpeContract.getPastOpenChannels(this._paymentAddress, this._lastReadBlock);
    this._paymentChannels = [...this._paymentChannels, ...newPaymentChannels];
    this._lastReadBlock = currentBlockNumber;

    await this._updateChannelStates();
    return channelManagementStrategy.selectChannel(this._paymentChannels, servicePaymentAddress, groupId, this._pricePerServiceCall, this._expiryThreshold);
  }

  async _updateChannelStates() {
    const currentChannelStatesPromise = map(this._paymentChannels, (paymentChannel) => {
      return paymentChannel.syncState(this._paymentChannelStateServiceClient);
    });
    await Promise.all(currentChannelStatesPromise);
  }

  _generatePaymentChannelStateServiceClient() {
    const serviceEndpoint = this._getServiceEndpoint();
    const grpcChannel = this._getGrpcChannel(serviceEndpoint);
    return new paymentChannelStateServices.PaymentChannelStateServiceClient(serviceEndpoint.host, grpcChannel);
  }

  _getServiceEndpoint() {
    const { group_name: defaultGroupName } = this._metadata.groups[0];
    const { endpoints } = this._metadata;
    const { endpoint } = find(endpoints, ({ group_name: groupName }) => groupName === defaultGroupName);
    return endpoint && url.parse(endpoint);
  }

  _getGrpcChannel(serviceEndpoint) {
    if(serviceEndpoint.protocol === 'https:') {
      return grpc.credentials.createSsl();
    }

    if(serviceEndpoint.protocol === 'http:') {
      return grpc.credentials.createInsecure();
    }

    throw new Error(`Protocol: ${serviceEndpoint.protocol} not supported`);
  }
}
