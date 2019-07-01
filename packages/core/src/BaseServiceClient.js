import url from "url";
import { BigNumber } from 'bignumber.js';
import { find, map } from 'lodash';
import logger from './utils/logger';

class BaseServiceClient {
  /**
   * @param {SnetSDK} sdk
   * @param {MPEContract} mpeContract
   * @param {ServiceMetadata} metadata
   * @param {Group} group
   * @param {DefaultPaymentChannelManagementStrategy} paymentChannelManagementStrategy
   * @param {ServiceClientOptions} [options={}]
   */
  constructor(sdk, mpeContract, metadata, group, paymentChannelManagementStrategy, options = {}) {
    this._sdk = sdk;
    this._mpeContract = mpeContract;
    this._options = options;
    this._metadata = metadata;
    this._group = {
      group_id_in_bytes: Buffer.from(group.group_id, 'base64'),
      ...group
    };
    this._paymentChannelManagementStrategy = paymentChannelManagementStrategy;
    this._paymentChannelStateServiceClient = this._generatePaymentChannelStateServiceClient();
    this._paymentChannels = [];
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
   * Fetches the latest channel state from the ai service daemon
   * @param channelId
   * @returns {Promise<ChannelStateReply>}
   */
  async getChannelState(channelId) {
    const signatureBytes = this._account.signedData({ t: 'uint256', v: channelId });

    const channelIdBytes = Buffer.alloc(4);
    channelIdBytes.writeUInt32BE(channelId, 0);

    const ChannelStateRequest = this._getChannelStateRequestMethodDescriptor();
    const channelStateRequest = new ChannelStateRequest();
    channelStateRequest.setChannelId(channelIdBytes);
    channelStateRequest.setSignature(signatureBytes);

    return new Promise((resolve, reject) => {
      this.paymentChannelStateServiceClient.getChannelState(channelStateRequest, (err, response) => {
        if(err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * @returns {Promise.<PaymentChannel[]>}
   */
  async loadOpenChannels() {
    const currentBlockNumber = await this._web3.eth.getBlockNumber();
    const newPaymentChannels = await this._mpeContract.getPastOpenChannels(this._account, this, this._lastReadBlock);
    logger.debug(`Found ${newPaymentChannels.length} payment channel open events`, { tags: ['PaymentChannel'] });
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

  async _fetchPaymentMetadata() {
    logger.debug('Selecting PaymentChannel using the given strategy', { tags: ['PaymentChannelManagementStrategy, gRPC'] });
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

    return { channelId, nonce, signingAmount, signatureBytes };
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

  get _pricePerServiceCall() {
    return new BigNumber(this._metadata.pricing.price_in_cogs);
  }

  _getServiceEndpoint() {
    if (this._options.endpoint) {
      return (url.parse(this._options.endpoint));
    }

    const { group_name: defaultGroupName } = this.group;
    const { endpoints } = this._metadata;
    const { endpoint } = find(endpoints, ({ group_name: groupName }) => groupName === defaultGroupName);
    logger.debug(`Service endpoint: ${endpoint}`, { tags: ['gRPC']});
    return endpoint && url.parse(endpoint);
  }

  _generatePaymentChannelStateServiceClient() {
    logger.error('_generatePaymentChannelStateServiceClient must be implemented in the sub classes');
  }

  _getChannelStateRequestMethodDescriptor() {
    logger.error('_getChannelStateRequestMethodDescriptor must be implemented in the sub classes');
  }
}

export default BaseServiceClient;
