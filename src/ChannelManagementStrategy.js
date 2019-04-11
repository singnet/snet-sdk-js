import MPENetworks from 'singularitynet-platform-contracts/networks/MultiPartyEscrow';
import grpc from 'grpc';
import { find, map } from 'lodash';

import paymentChannelStateServices from './payment_channel_state_service_grpc_pb';
import paymentChannelStateMessages from './payment_channel_state_service_pb';
import MPEContract from './MPEContract';

export default class ChannelManagementStrategy {
  constructor(web3, account, config, serviceMetadata) {
    this._web3 = web3;
    this._account = account;
    this._config = config;
    this._mpeContract = new MPEContract(this._web3, this._account, this._config);
    this._networkId = this._config.networkId;
    this._openChannels = [];
    this._serviceMetadata = serviceMetadata;
    this._serviceEndpoint = this._serviceMetadata.endpoints[0].endpoint.replace('https://', '');
    this._pricePerCall = this._serviceMetadata.pricing.price_in_cogs;
    this._expiryThreshold = this._serviceMetadata.payment_expiration_threshold;
  }

  async setup() {
    const defaultGroup = this._serviceMetadata.groups[0];
    const { payment_address: servicePaymentAddress } = defaultGroup;
    const { transactionHash } = MPENetworks[this._networkId];
    const { blockNumber } = await this._web3.eth.getTransactionReceipt(transactionHash);
    this._openChannels = await this._fetchOpenChannels(servicePaymentAddress, blockNumber);
  }

  async callMetadata() {
    const channelId = await this.select();
    const { lastSignedAmount, nonce } = await this._fetchChannelState(channelId);

    return {
      channelId,
      lastSignedAmount: lastSignedAmount + this._pricePerCall,
      nonce,
    };
  }

  async select() {
    const mpeBalance = await this._account.escrowBalance();
    const updatedChannels = await this._getUpdatedChannelDetails();
    const defaultGroup = this._serviceMetadata.groups[0];
    const { payment_address: servicePaymentAddress, group_id: groupId } = defaultGroup;
    const defaultExpiration = await this._getDefaultChannelExpiration();
    const groupIdBytes = Buffer.from(groupId, 'base64');

    if(updatedChannels.length === 0) {
      if(mpeBalance > this._pricePerCall) {
        const newChannelReceipt = await this._mpeContract.openChannel(this._account.address, servicePaymentAddress, groupIdBytes, this._pricePerCall, defaultExpiration);
        const openChannels = await this._fetchOpenChannels(servicePaymentAddress, newChannelReceipt.blockNumber);
        return openChannels[0].channelId.toString();
      }

      const newfundedChannelReceipt = await this._mpeContract.depositAndOpenChannel(this._account.address, servicePaymentAddress, groupIdBytes, this._pricePerCall, defaultExpiration);
      const openChannels = await this._fetchOpenChannels(servicePaymentAddress, newfundedChannelReceipt.blockNumber);
      return openChannels[0].channelId.toString();
    }

    const firstFundedValidChannel = find(updatedChannels, ({ hasSufficientFunds, isValid }) => hasSufficientFunds && isValid);
    if(firstFundedValidChannel) {
      return firstFundedValidChannel.channelId.toString();
    }

    const firstFundedChannel = find(updatedChannels, 'hasSufficientFunds');
    if(firstFundedChannel) {
      return firstFundedChannel.channelId.toString();
    }

    const firstValidChannel = find(updatedChannels, 'isValid');
    if(firstValidChannel) {
      return firstValidChannel.channelId.toString();
    }

    await this._mpeContract.channelExtendAndAddFunds(updatedChannels[0].channelId, defaultExpiration, this._pricePerCall);
    return updatedChannels[0].channelId.toString();
  }

  async _getUpdatedChannelDetails() {
    const openChannels = this._openChannels;
    const currentBlockNumber = await this._web3.eth.getBlockNumber();
    const updatedChannelPromises = map(openChannels, ({ channelId }) => {
      const channelPromise = new Promise(resolve => resolve(channelId));
      const updatedOpenChannelPromise = this._account._getMPEContract().methods.channels(channelId.toString()).call();
      const currentChannelStatePromise = this._fetchChannelState(channelId);
      return Promise.all([channelPromise, updatedOpenChannelPromise, currentChannelStatePromise]);
    });
    const resolvedUpdatedChannels = await Promise.all(updatedChannelPromises);
    return map(resolvedUpdatedChannels, ([channelId, updatedOpenChannel, currentChannelState]) => {
      const { lastSignedAmount, nonce: currentNonce, value: initialAmount } = currentChannelState;
      const { nonce, expiration } = updatedOpenChannel;
      const availableAmount = initialAmount - lastSignedAmount;
      return {
        channelId,
        nonce,
        currentNonce,
        expiration,
        initialAmount,
        lastSignedAmount,
        availableAmount,
        hasSufficientFunds: availableAmount >= this._pricePerCall,
        isValid: expiration > (currentBlockNumber + this._expiryThreshold),
      };
    });
  }

  async _fetchOpenChannels(recipientAddress, blockNumber) {
    const channelOpenTopic = this._web3.utils.sha3('ChannelOpen(uint256,uint256,address,address,address,bytes32,uint256,uint256)');
    const topics = [channelOpenTopic];
    const options = {
      fromBlock: blockNumber,
      address: MPENetworks[this._networkId].address,
      topics,
    };
    const channelOpenLogs = await this._web3.eth.getPastLogs(options);
    const inputs = [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'groupId', type: 'bytes32', indexed: true },
      { name: 'channelId', type: 'uint256', indexed: false },
      { name: 'nonce', type: 'uint256', indexed: false },
      { name: 'signer', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'expiration', type: 'uint256', indexed: false },
    ];
    const filteredChannelOpenLogs = channelOpenLogs.filter((log) => {
      const channelInfo = this._web3.eth.abi.decodeLog(inputs, log.data, log.topics.slice(1));
      return channelInfo.sender === this._account.address
        && channelInfo.recipient === recipientAddress
        && channelInfo.signer === this._account.address;
    });

    return filteredChannelOpenLogs.map(log => this._web3.eth.abi.decodeLog(inputs, log.data, log.topics.slice(1)));
  }

  async _fetchChannelState(channelId) {
    const paymentChannelStateServiceClient = new paymentChannelStateServices.PaymentChannelStateServiceClient(this._serviceEndpoint, grpc.credentials.createSsl());

    const sha3Message = this._web3.utils.soliditySha3({ t: 'uint256', v: channelId });
    const { signature } = this._account.sign(sha3Message);
    const stripped = signature.substring(2, signature.length);
    const byteSig = Buffer.from(stripped, 'hex');
    const signatureBytes = Buffer.from(byteSig);

    const channelIdBytes = Buffer.alloc(4);
    channelIdBytes.writeUInt32BE(channelId, 0);

    const channelStateRequest = new paymentChannelStateMessages.ChannelStateRequest();
    channelStateRequest.setChannelId(channelIdBytes);
    channelStateRequest.setSignature(signatureBytes);

    return new Promise((resolve, reject) => {
      paymentChannelStateServiceClient.getChannelState(channelStateRequest, (err, response) => {
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

  async _getDefaultChannelExpiration() {
    const currentBlockNumber = await this._web3.eth.getBlockNumber();
    return currentBlockNumber + this._serviceMetadata.payment_expiration_threshold + (3600 * 24 * 7);
  }
}
