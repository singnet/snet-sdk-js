import Web3 from 'web3';
import IPFSClient from 'ipfs-http-client';
import grpc, { InterceptingCall } from 'grpc';
import url from 'url';
import { find } from 'lodash';
import MPENetworks from 'singularitynet-platform-contracts/networks/MultiPartyEscrow';
import RegistryNetworks from 'singularitynet-platform-contracts/networks/Registry.json';
import RegistryAbi from 'singularitynet-platform-contracts/abi/Registry.json';

import Account from './Account';
import ChannelManagementStrategy from './ChannelManagementStrategy';

const { HttpProvider } = Web3.providers;

export default class SnetSDK {
  constructor(config) {
    this._config = config;
    const options = {
      defaultGas: this._config.defaultGasLimit,
      defaultGasPrice: this._config.defaultGasPrice,
    };
    this._networkId = config.networkId;
    const httpProvider = new HttpProvider(config.web3Provider);
    const web3 = new Web3(httpProvider, null, options);
    const account = web3.eth.accounts.privateKeyToAccount(config.privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    this._web3 = web3;
    this._account = new Account(this._web3, this._config);
    const registryAddress = RegistryNetworks[this._networkId].address;
    this._registryContract = new this._web3.eth.Contract(RegistryAbi, registryAddress, { from: this._account.address });
    this._serviceClient = {};
  }

  get account() {
    return this._account;
  }

  async createServiceClient(orgId, serviceId, ServiceStub) {
    const serviceMetadata = await this._getServiceMetadata(orgId, serviceId);
    this._serviceClient.metadata = serviceMetadata;
    const channelManagementStrategy = new ChannelManagementStrategy(this._web3, this._account, this._config, serviceMetadata);
    await channelManagementStrategy.setup();

    const grpcOptions = {
      interceptors: [this.generateInterceptor(channelManagementStrategy)],
    };
    const serviceEndpoint = this._getServiceEndpoint();
    const grpcChannel = this._getGrpcChannel(serviceEndpoint);
    return new ServiceStub(serviceEndpoint.host, grpcChannel, grpcOptions);
  }

  generateInterceptor(channelManagementStrategy) {
    return (options, nextCall) => {
      const requester = {
        start: async (metadata, listener, next) => {
          const { channelId, nonce, lastSignedAmount } = await channelManagementStrategy.callMetadata();
          const sha3Message = this._web3.utils.soliditySha3(
            { t: 'address', v: MPENetworks[this._networkId].address },
            { t: 'uint256', v: channelId },
            { t: 'uint256', v: nonce },
            { t: 'uint256', v: lastSignedAmount },
          );
          const { signature } = this._account.sign(sha3Message);
          const stripped = signature.substring(2, signature.length);
          const byteSig = Buffer.from(stripped, 'hex');
          const signatureBytes = Buffer.from(byteSig);

          metadata.add('snet-payment-type', 'escrow');
          metadata.add('snet-payment-channel-id', `${channelId}`);
          metadata.add('snet-payment-channel-nonce', `${nonce}`);
          metadata.add('snet-payment-channel-amount', `${lastSignedAmount}`);
          metadata.add('snet-payment-channel-signature-bin', signatureBytes);
          next(metadata, listener);
        },
      };
      return new InterceptingCall(nextCall(options), requester);
    };
  }

  async _getServiceMetadata(orgId, serviceId) {
    const { protocol = 'http', hostname: host, port = 5001 } = url.parse(this._config.ipfsEndpoint);
    const ipfsHostOrMultiaddr = { protocol, host, port };
    const ipfsClient = IPFSClient(ipfsHostOrMultiaddr);
    const orgIdBytes = this._web3.utils.fromAscii(orgId);
    const serviceIdBytes = this._web3.utils.fromAscii(serviceId);

    const { metadataURI } = await this._registryContract
      .methods
      .getServiceRegistrationById(orgIdBytes, serviceIdBytes)
      .call();

    const ipfsCID = `${this._web3.utils.hexToUtf8(metadataURI).substring(7)}`;
    const data = await ipfsClient.cat(ipfsCID);
    return JSON.parse(data.toString());
  }

  _getServiceEndpoint() {
    const { group_name: defaultGroupName } = this._serviceClient.metadata.groups[0];
    const { endpoints } = this._serviceClient.metadata;
    const endpoint = find(endpoints, ({ group_name: groupName }) => groupName === defaultGroupName);
    return endpoint && url.parse(endpoint);
  }

  _getGrpcChannel(serviceEndpoint) {
    if(serviceEndpoint.protocol === 'https') {
      return grpc.credentials.createSsl();
    }

    if(serviceEndpoint.protocol === 'http') {
      return grpc.credentials.createInsecure();
    }

    throw new Error(`Protocol: ${serviceEndpoint.protocol} not supported`);
  }
}
