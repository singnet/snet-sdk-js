import Web3 from 'web3';
import IPFSClient from 'ipfs-http-client';
import url from 'url';
import RegistryNetworks from 'singularitynet-platform-contracts/networks/Registry.json';
import RegistryAbi from 'singularitynet-platform-contracts/abi/Registry.json';

import Account from './Account';
import MPEContract from './MPEContract';
import { find } from 'lodash';
import { DefaultPaymentChannelManagementStrategy } from './payment_channel_management_strategies';
import logger from './utils/logger';

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
    const identity = this._createIdentity();
    this._mpeContract = new MPEContract(this._web3, this._networkId);
    this._account = new Account(this._web3, this._networkId, this._mpeContract, identity);
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

  set paymentChannelManagementStrategy(paymentChannelManagementStrategy) {
    this._paymentChannelManagementStrategy = paymentChannelManagementStrategy;
  }

  /**
   * @param {string} orgId
   * @param {string} serviceId
   * @returns {Promise.<ServiceMetadata>}
   */
  async serviceMetadata(orgId, serviceId) {
    logger.debug(`Fetching service metadata [org: ${orgId} | service: ${serviceId}]`);
    const { protocol = 'http', hostname: host, port = 5001 } = url.parse(this._config.ipfsEndpoint);
    const ipfsHostOrMultiaddr = { protocol: protocol.replace(':', ''), host, port };
    const ipfsClient = IPFSClient(ipfsHostOrMultiaddr);
    const orgIdBytes = this._web3.utils.fromAscii(orgId);
    const serviceIdBytes = this._web3.utils.fromAscii(serviceId);

    logger.debug(`Fetching metadata URI from registry contract`);
    const { metadataURI } = await this._registryContract
      .methods
      .getServiceRegistrationById(orgIdBytes, serviceIdBytes)
      .call();

    const ipfsCID = `${this._web3.utils.hexToUtf8(metadataURI).substring(7)}`;
    logger.debug(`Fetching metadata from IPFS[CID: ${ipfsCID}]`);
    const data = await ipfsClient.cat(ipfsCID);
    return JSON.parse(data.toString());
  }

  async _serviceGroup(serviceMetadata, orgId, serviceId, groupName = 'default_group') {
    const group = find(serviceMetadata.groups, ({ group_name }) => group_name === groupName);
    if(!group) {
      const errorMessage = `Group[name: ${groupName}] not found for orgId: ${orgId} and serviceId: ${serviceId}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    return group;
  }

  _constructStrategy(paymentChannelManagementStrategy) {
    if (paymentChannelManagementStrategy) {
      return paymentChannelManagementStrategy;
    }

    if (this._paymentChannelManagementStrategy) {
      return this._paymentChannelManagementStrategy;
    }

    logger.debug('PaymentChannelManagementStrategy not provided, using DefaultPaymentChannelManagementStrategy');
    return new DefaultPaymentChannelManagementStrategy(this);
  }

  _createIdentity() {
    logger.error('_createIdentity must be implemented in the sub classes');
  }
}

export default SnetSDK;
