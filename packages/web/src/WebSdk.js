import SnetSDK, { MetaMaskIdentity } from './sdk-core';
import WebServiceClient from './WebServiceClient';

class WebSdk extends SnetSDK {
  /**
   * @param {string} orgId
   * @param {string} serviceId
   * @param {null} [groupName='default_group']
   * @param {DefaultPaymentChannelManagementStrategy} [paymentChannelManagementStrategy=DefaultPaymentChannelManagementStrategy]
   * @param {ServiceClientOptions} options
   * @returns {Promise<WebServiceClient>}
   */
  async createServiceClient(orgId, serviceId, groupName = null, paymentChannelManagementStrategy = null, options = {}) {
    const serviceMetadata = await this.serviceMetadata(orgId, serviceId);
    const group = await this._serviceGroup(serviceMetadata, orgId, serviceId, groupName);
    return new WebServiceClient(this, orgId, serviceId, this._mpeContract, serviceMetadata, group, this._constructStrategy(paymentChannelManagementStrategy), options);
  }

  _createIdentity() {
    return new MetaMaskIdentity(this._config, this._web3);
  }
}

export default WebSdk;
