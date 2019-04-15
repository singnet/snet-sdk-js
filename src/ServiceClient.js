import grpc, { InterceptingCall } from "grpc";
import url from "url";
import { find } from 'lodash';

export default class ServiceClient {
  constructor(metadata, web3, account, mpeContract, ServiceStub, channelManagementStrategy) {
    this._metadata = metadata;
    this._web3 = web3;
    this._account = account;
    this._mpeContract = mpeContract;
    this._grpcStub = this._generateGrpcStub(ServiceStub, channelManagementStrategy)
  }

  get stub() {
    return this._grpcStub;
  }

  _generateGrpcStub(ServiceStub, channelManagementStrategy) {
    const grpcOptions = {
      interceptors: [this._generateInterceptor(channelManagementStrategy)],
    };

    const serviceEndpoint = this._getServiceEndpoint();
    const grpcChannel = this._getGrpcChannel(serviceEndpoint);
    return new ServiceStub(serviceEndpoint.host, grpcChannel, grpcOptions);
  }

  _generateInterceptor(channelManagementStrategy) {
    return (options, nextCall) => {
      const requester = {
        start: async (metadata, listener, next) => {
          const { channelId, nonce, lastSignedAmount } = await channelManagementStrategy.callMetadata();
          const sha3Message = this._web3.utils.soliditySha3(
            { t: 'address', v: this._mpeContract.address },
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

  _getServiceEndpoint() {
    const { group_name: defaultGroupName } = this._metadata.groups[0];
    const { endpoints } = this._metadata;
    const { endpoint } = find(endpoints, ({ group_name: groupName }) => groupName === defaultGroupName);
    return endpoint && url.parse(endpoint);
  }

  _getGrpcChannel(serviceEndpoint) {
    if(serviceEndpoint.protocol === 'https:') {
      return grpc.credentials.createSsl();
    }

    if(serviceEndpoint.protocol === 'http:') {
      return grpc.credentials.createInsecure();
    }

    throw new Error(`Protocol: ${serviceEndpoint.protocol} not supported`);
  }
}
