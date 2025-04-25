import SnetSDK, { WalletRPCIdentity } from './sdk-core';
import WebServiceClient from './WebServiceClient';
import RegistryContract from './RegistryContract';

class WebSdk extends SnetSDK {
  constructor(...args) {
    super(...args);
    this._registryContract = new RegistryContract(this._web3, this._networkId, this._config.tokenName, this._config.standType);
  }

  /**
   * @param {string} orgId
   * @param {string} serviceId
   * @param {string} [groupName]
   * @param {PaymentChannelManagementStrategy} [paymentChannelManagementStrategy=DefaultPaymentChannelManagementStrategy]
   * @param {ServiceClientOptions} options
   * @returns {Promise<WebServiceClient>}
   */
  async createServiceClient(orgId, serviceId, groupName = null, paymentChannelManagementStrategy = null, options = {}) {
    const serviceMetadata = await this._metadataProvider.metadata(orgId, serviceId);
    const group = await this._serviceGroup(serviceMetadata, orgId, serviceId, groupName);
    return new WebServiceClient(this, orgId, serviceId, this._mpeContract, serviceMetadata, group, this._constructStrategy(paymentChannelManagementStrategy), options);
  }

  _createIdentity() {
    return new WalletRPCIdentity(this._config, this._web3);
  }

  async setupAccount() {
    await this._account._identity.setupAccount()
  }
}

export default WebSdk;
