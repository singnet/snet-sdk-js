import MPENetworks from 'singularitynet-platform-contracts/networks/MultiPartyEscrow';
import grpc from 'grpc';

import paymentChannelStateServices from './payment_channel_state_service_grpc_pb';
import paymentChannelStateMessages from './payment_channel_state_service_pb';

export default class ChannelManagementStrategy {
  constructor(web3, account, config, serviceMetadata) {
    this._web3 = web3;
    this._account = account;
    this._config = config;
    this._networkId = this._config.networkId;
    this._openChannels = [];
    this._serviceMetadata = serviceMetadata;
    this._serviceEndpoint = this._serviceMetadata.endpoints[0].endpoint.replace('https://', '');
    this._pricePerCall = this._serviceMetadata.pricing.price_in_cogs;
  }

  async setup() {
    const defaultGroup = this._serviceMetadata.groups[0];
    const { payment_address: servicePaymentAddress } = defaultGroup;
    this._openChannels = await this._fetchOpenChannels(servicePaymentAddress);
  }

  async callMetadata() {
    const channelId = await this.select(this._openChannels);
    const { lastSignedAmount, nonce } = await this._fetchChannelState(channelId);

    return {
      channelId,
      lastSignedAmount: lastSignedAmount + this._pricePerCall,
      nonce,
    };
  }

  async select(channels) {
    return channels[0].channelId.toString();
  }

  async _fetchOpenChannels(recipientAddress) {
    const { transactionHash } = MPENetworks[this._networkId];
    const mpeDeploymentReceipt = await this._web3.eth.getTransactionReceipt(transactionHash);
    const channelOpenTopic = this._web3.utils.sha3('ChannelOpen(uint256,uint256,address,address,address,bytes32,uint256,uint256)');
    const topics = [channelOpenTopic];
    const options = {
      fromBlock: mpeDeploymentReceipt.blockNumber,
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
          const currentSignedAmountBuffer = Buffer.from(response.getCurrentSignedAmount());
          const currentSignedAmount = currentSignedAmountBuffer.readUInt32BE(28);
          const nonceBuffer = Buffer.from(response.getCurrentNonce());
          const nonce = nonceBuffer.readUInt32BE(28);
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
