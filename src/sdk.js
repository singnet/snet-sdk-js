import Web3 from 'web3';
import IPFSClient from 'ipfs-http-client';
import url from 'url';
import RegistryNetworks from 'singularitynet-platform-contracts/networks/Registry.json';
import RegistryAbi from 'singularitynet-platform-contracts/abi/Registry.json';

import Account from './Account';
import MPEContract from './MPEContract';
import ServiceClient from './ServiceClient';
import { find } from 'lodash';
import DefaultPaymentChannelManagementStrategy from './payment_channel_management_strategies';

const DEFAULT_CONFIG = {
  defaultGasLimit: 210000,
  defaultGasPrice: 4700000,
  ipfsEndpoint: 'http://ipfs.singularitynet.io:80',
};

class SnetSDK {
  /**
   * @param {Config} config
   */
  constructor(config) {
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    const options = {
      defaultGas: this._config.defaultGasLimit,
      defaultGasPrice: this._config.defaultGasPrice,
    };
    this._networkId = config.networkId;
    this._web3 = new Web3(config.web3Provider, null, options);
    this._mpeContract = new MPEContract(this._web3, this._networkId);
    this._account = new Account(this._web3, this._networkId, this._config, this._mpeContract);
    this._web3.eth.defaultAccount = this._account.address;
    const registryAddress = RegistryNetworks[this._networkId].address;
    this._registryContract = new this._web3.eth.Contract(RegistryAbi, registryAddress, { from: this._account.address });
  }

  /**
   * @type {Account}
   */
  get account() {
    return this._account;
  }

  /**
   * @type {Web3}
   */
  get web3() {
    return this._web3;
  }

  /**
   * @param {string} orgId
   * @param {string} serviceId
   * @param {GRPCClient} ServiceStub GRPC service client constructor
   * @param {string} [groupName='default_group']
   * @param {DefaultPaymentChannelManagementStrategy} [paymentChannelManagementStrategy=DefaultPaymentChannelManagementStrategy]
   * @param {ServiceClientOptions} options
   * @returns {Promise<ServiceClient>}
   */
  async createServiceClient(orgId, serviceId, ServiceStub, groupName = 'default_group', paymentChannelManagementStrategy = null, options = {}) {
    const serviceMetadata = await this.serviceMetadata(orgId, serviceId);
    const group = find(serviceMetadata.groups, ({ group_name }) => group_name === groupName);
    if(!group) {
      throw new Error(`Group[name: ${groupName}] not found for orgId: ${orgId} and serviceId: ${serviceId}`);
    }
    return new ServiceClient(this, this._mpeContract, serviceMetadata, group, ServiceStub, this._constructStrategy(paymentChannelManagementStrategy), options);
  }

  /**
   * @param {string} orgId
   * @param {string} serviceId
   * @returns {Promise.<ServiceMetadata>}
   */
  async serviceMetadata(orgId, serviceId) {
    const { protocol = 'http', hostname: host, port = 5001 } = url.parse(this._config.ipfsEndpoint);
    const ipfsHostOrMultiaddr = { protocol: protocol.replace(':', ''), host, port };
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

  _constructStrategy(paymentChannelManagementStrategy) {
    if (paymentChannelManagementStrategy) {
      return paymentChannelManagementStrategy;
    }

    return new DefaultPaymentChannelManagementStrategy(this);
  }
}

export default SnetSDK;
