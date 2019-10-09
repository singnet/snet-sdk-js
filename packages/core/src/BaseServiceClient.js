import url from "url";
import { BigNumber } from 'bignumber.js';
import { find, first, isEmpty, map } from 'lodash';
import logger from './utils/logger';

import { toBNString } from './utils/bignumber_helper';

class BaseServiceClient {
  /**
   * @param {SnetSDK} sdk
   * @param {String} orgId
   * @param {String} serviceId
   * @param {MPEContract} mpeContract
   * @param {ServiceMetadata} metadata
   * @param {Group} group
   * @param {DefaultPaymentChannelManagementStrategy} paymentChannelManagementStrategy
   * @param {ServiceClientOptions} [options={}]
   */
  constructor(sdk, orgId, serviceId, mpeContract, metadata, group, paymentChannelManagementStrategy, options = {}) {
    this._sdk = sdk;
    this._mpeContract = mpeContract;
    this._options = options;
    this._metadata = { orgId, serviceId, ...metadata };
    this._group = this._enhanceGroupInfo(group);
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
    const channelStateRequest = await this._channelStateRequest(channelId);

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
   * @param {BigNumber} expiry
   * @returns {Promise.<PaymentChannel>}
   */
  async openChannel(amount, expiry) {
    const newChannelReceipt = await this._mpeContract.openChannel(this._account, this, amount, expiry);
    return this._getNewlyOpenedChannel(newChannelReceipt);
  }

  /**
   * @param {BigNumber} amount
   * @param {BigNumber} expiry
   * @returns {Promise.<PaymentChannel>}
   */
  async depositAndOpenChannel(amount, expiry) {
    const newFundedChannelReceipt = await this._mpeContract.depositAndOpenChannel(this._account, this, amount, expiry);
    return this._getNewlyOpenedChannel(newFundedChannelReceipt);
  }

  _enhanceGroupInfo(group) {
    if(isEmpty(group)) {
      return group;
    }

    const { payment_address, payment_expiration_threshold } = group.payment;

    return {
      group_id_in_bytes: Buffer.from(group.group_id, 'base64'),
      ...group,
      payment_address,
      payment_expiration_threshold,
    };
  }

  async _channelStateRequest(channelId) {
    const { currentBlockNumber, signatureBytes } = await this._channelStateRequestProperties(channelId);
    const channelIdBytes = Buffer.alloc(4);
    channelIdBytes.writeUInt32BE(channelId, 0);

    const ChannelStateRequest = this._getChannelStateRequestMethodDescriptor();
    const channelStateRequest = new ChannelStateRequest();
    channelStateRequest.setChannelId(channelIdBytes);
    channelStateRequest.setSignature(signatureBytes);
    channelStateRequest.setCurrentBlock(currentBlockNumber);
    return channelStateRequest;
  }

  async _channelStateRequestProperties(channelId) {
    if(this._options.channelStateRequestSigner) {
      const { currentBlockNumber, signatureBytes } = await this._options.channelStateRequestSigner(channelId);
      return { currentBlockNumber, signatureBytes };
    }

    const currentBlockNumber = await this._web3.eth.getBlockNumber();
    const channelIdStr = toBNString(channelId);
    const signatureBytes = await this._account.signData(
      { t: 'string', v: '__get_channel_state' },
      { t: 'address', v: this._mpeContract.address },
      { t: 'uint256', v: channelIdStr },
      { t: 'uint256', v: currentBlockNumber },
    );

    return { currentBlockNumber, signatureBytes };
  }

  async _fetchPaymentMetadata() {
    logger.debug('Selecting PaymentChannel using the given strategy', { tags: ['PaymentChannelManagementStrategy, gRPC'] });
    const channel = await this._paymentChannelManagementStrategy.selectChannel(this);

    const { channelId, state: { nonce, currentSignedAmount }} = channel;
    const signingAmount = currentSignedAmount.plus(this._pricePerServiceCall);
    const channelIdStr = toBNString(channelId);
    const nonceStr = toBNString(nonce);
    const signingAmountStr = toBNString(signingAmount);
    logger.info(`Using PaymentChannel[id: ${channelIdStr}] with nonce: ${nonceStr} and amount: ${signingAmountStr} and `, { tags: ['PaymentChannelManagementStrategy', 'gRPC'] });

    if (this._options.paidCallMetadataGenerator) {
      const { signatureBytes } = await this._options.paidCallMetadataGenerator(channelId, signingAmount, nonce);
      return { channelId, nonce, signingAmount, signatureBytes };
    }

    const signatureBytes = await this._account.signData(
      { t: 'string', v: '__MPE_claim_message' },
      { t: 'address', v: this._mpeContract.address },
      { t: 'uint256', v: channelIdStr },
      { t: 'uint256', v: nonceStr },
      { t: 'uint256', v: signingAmountStr },
    );

    return { channelId, nonce, signingAmount, signatureBytes };
  }

  async _getNewlyOpenedChannel(receipt) {
    const openChannels = await this._mpeContract.getPastOpenChannels(this._account, this, receipt.blockNumber, this);
    const newPaymentChannel = openChannels[0];
    logger.info(`New PaymentChannel[id: ${newPaymentChannel.channelId}] opened`);
    return newPaymentChannel;
  }

  get _web3() {
    return this._sdk.web3;
  }

  get _account() {
    return this._sdk.account;
  }

  get _pricePerServiceCall() {
    const { pricing } = this.group;
    const fixedPricing = find(pricing, ({ price_model }) => 'fixed_price' === price_model);

    return new BigNumber(fixedPricing.price_in_cogs);
  }

  _getServiceEndpoint() {
    if (this._options.endpoint) {
      return (url.parse(this._options.endpoint));
    }

    const { endpoints } = this.group;
    const endpoint = first(endpoints);
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
