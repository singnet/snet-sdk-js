import Web3 from 'web3';
import IPFSClient from 'ipfs-http-client';
import url from 'url';
import RegistryNetworks from 'singularitynet-platform-contracts/networks/Registry.json';
import RegistryAbi from 'singularitynet-platform-contracts/abi/Registry.json';

import Account from './Account';
import ChannelManagementStrategy from './ChannelManagementStrategy';
import MPEContract from './MPEContract';
import ServiceClient from './ServiceClient';

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
    this._mpeContract = new MPEContract(this._web3, this._config);
    this._account = new Account(this._web3, this._config, this._mpeContract);
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
    const channelManagementStrategy = new ChannelManagementStrategy(this._web3, this._account, this._config, this._mpeContract);
    return new ServiceClient(serviceMetadata, this._web3, this.account, this._mpeContract, ServiceStub, channelManagementStrategy);
  }

  async _getServiceMetadata(orgId, serviceId) {
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
}
