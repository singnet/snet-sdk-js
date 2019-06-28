import SnetSDK from '../../core/src';
import ServiceClient from './ServiceClient';

class NodeSdk extends SnetSDK {
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
    const group = await this._serviceGroup(serviceMetadata, orgId, serviceId, groupName);
    return new ServiceClient(this, this._mpeContract, serviceMetadata, group, ServiceStub, this._constructStrategy(paymentChannelManagementStrategy), options);
  }
}

export default NodeSdk;
