import grpc, { InterceptingCall } from "grpc";
import url from "url";
import { BigNumber } from 'bignumber.js';
import { find, map } from 'lodash';
import paymentChannelStateServices from './payment_channel_state_service_grpc_pb';
import logger from './utils/logger';

class ServiceClient {
  /**
   * @param {SnetSDK} sdk
   * @param {MPEContract} mpeContract
   * @param {ServiceMetadata} metadata
   * @param {Group} group
   * @param {GRPCClient} ServiceStub - GRPC service client constructor
   * @param {DefaultPaymentChannelManagementStrategy} paymentChannelManagementStrategy
   * @param {ServiceClientOptions} [options={}]
   */
  constructor(sdk, mpeContract, metadata, group, ServiceStub, paymentChannelManagementStrategy, options = {}) {
    this._sdk = sdk;
    this._mpeContract = mpeContract;
    this._options = options;
    this._metadata = metadata;
    this._group = {
      group_id_in_bytes: Buffer.from(group.group_id, 'base64'),
      ...group
    };
    this._paymentChannelManagementStrategy = paymentChannelManagementStrategy;
    this._grpcService = this._constructGrpcService(ServiceStub);
    this._paymentChannelStateServiceClient = this._generatePaymentChannelStateServiceClient();
    this._paymentChannels = [];
  }

  /**
   * @type {GRPCClient}
   */
  get service() {
    return this._grpcService;
  }

  /**
   * @type {Group}
   */
  get group() {
    return this._group;
  }

  /**
   * @type {Array.<PaymentChannel>}
   */
  get paymentChannels() {
    return this._paymentChannels;
  }

  /**
   * @type {ServiceMetadata}
   */
  get metadata() {
    return this._metadata;
  }

  /**
   * @type {GRPCClient}
   */
  get paymentChannelStateServiceClient() {
    return this._paymentChannelStateServiceClient;
  }

  /**
   * @returns {Promise.<PaymentChannel[]>}
   */
  async loadOpenChannels() {
    const currentBlockNumber = await this._web3.eth.getBlockNumber();
    const newPaymentChannels = await this._mpeContract.getPastOpenChannels(this._account, this, this._lastReadBlock);
    logger.info(`Found ${newPaymentChannels.length} payment channel open events`, { tags: ['PaymentChannel'] });
    this._paymentChannels = [...this._paymentChannels, ...newPaymentChannels];
    this._lastReadBlock = currentBlockNumber;
    return this._paymentChannels;
  }

  /**
   * @returns {Promise.<PaymentChannel[]>}
   */
  async updateChannelStates() {
    logger.info('Updating payment channel states', { tags: ['PaymentChannel'] });
    const currentChannelStatesPromise = map(this._paymentChannels, (paymentChannel) => {
      return paymentChannel.syncState();
    });
    await Promise.all(currentChannelStatesPromise);
    return this._paymentChannels;
  }

  /**
   *
   * @param {BigNumber} amount
   * @param {BigNumber} expiration
   * @returns {Promise.<PaymentChannel>}
   */
  async openChannel(amount, expiration) {
    const newChannelReceipt = await this._mpeContract.openChannel(this._account, this, amount, expiration);
    return this._getNewlyOpenedChannel(newChannelReceipt);
  }

  /**
   * @param {BigNumber} amount
   * @param {BigNumber} expiration
   * @returns {Promise.<PaymentChannel>}
   */
  async depositAndOpenChannel(amount, expiration) {
    const newFundedChannelReceipt = await this._mpeContract.depositAndOpenChannel(this._account, this, amount, expiration);
    return this._getNewlyOpenedChannel(newFundedChannelReceipt);
  }

  async _getNewlyOpenedChannel(receipt) {
    const openChannels = await this._mpeContract.getPastOpenChannels(this._account, this, receipt.blockNumber, this);
    const newPaymentChannel = openChannels[0];
    logger.info(`New PaymentChannel[id: ${newPaymentChannel.channelId} opened`);
    return newPaymentChannel;
  }

  get _web3() {
    return this._sdk.web3;
  }

  get _account() {
    return this._sdk.account;
  }

  _constructGrpcService(ServiceStub) {
    logger.info(`Creating service client`, { tags: ['gRPC']});
    const serviceEndpoint = this._getServiceEndpoint();
    const grpcChannelCredentials = this._getGrpcChannelCredentials(serviceEndpoint);
    const grpcOptions = this._generateGrpcOptions();
    logger.info(`Service pointing to ${serviceEndpoint.host}, `, { tags: ['gRPC']});
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

  _generateInterceptor() {
    return (options, nextCall) => {
      const requester = {
        start: async (metadata, listener, next) => {
          if (!this._paymentChannelManagementStrategy) {
            next(metadata, listener);
            return;
          }

          logger.info('Selecting PaymentChannel using the given strategy', { tags: ['PaymentChannelManagementStrategy, gRPC'] });
          const channel = await this._paymentChannelManagementStrategy.selectChannel(this);

          const { channelId, state: { nonce, lastSignedAmount }} = channel;
          const signingAmount = lastSignedAmount.plus(this._pricePerServiceCall);
          logger.info(`Using PaymentChannel[id: ${channelId}] with nonce: ${nonce} and amount: ${signingAmount} and `, { tags: ['PaymentChannelManagementStrategy', 'gRPC'] });

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
    logger.info(`Creating PaymentChannelStateService client`, { tags: ['gRPC']});
    const serviceEndpoint = this._getServiceEndpoint();
    const grpcChannelCredentials = this._getGrpcChannelCredentials(serviceEndpoint);
    logger.info(`PaymentChannelStateService pointing to ${serviceEndpoint.host}, `, { tags: ['gRPC']});
    return new paymentChannelStateServices.PaymentChannelStateServiceClient(serviceEndpoint.host, grpcChannelCredentials);
  }

  _getServiceEndpoint() {
    if (this._options.endpoint) {
      return (url.parse(this._options.endpoint));
    }

    const { group_name: defaultGroupName } = this.group;
    const { endpoints } = this._metadata;
    const { endpoint } = find(endpoints, ({ group_name: groupName }) => groupName === defaultGroupName);
    logger.info(`Service endpoint: ${endpoint}`, { tags: ['gRPC']});
    return endpoint && url.parse(endpoint);
  }

  _getGrpcChannelCredentials(serviceEndpoint) {
    if(serviceEndpoint.protocol === 'https:') {
      logger.info(`Channel credential created for https`, { tags: ['gRPC']});
      return grpc.credentials.createSsl();
    }

    if(serviceEndpoint.protocol === 'http:') {
      logger.info(`Channel credential created for http`, { tags: ['gRPC']});
      return grpc.credentials.createInsecure();
    }

    const errorMessage = `Protocol: ${serviceEndpoint.protocol} not supported`;
    logger.error(errorMessage, { tags: ['gRPC']});
    throw new Error(errorMessage);
  }
}

export default ServiceClient;
