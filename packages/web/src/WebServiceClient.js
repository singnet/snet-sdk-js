import { grpc } from '@improbable-eng/grpc-web';
import { PaymentChannelStateServiceClient } from './proto/state_service_pb_service';
import { ChannelStateRequest } from './proto/state_service_pb';
import { BaseServiceClient, logger } from './sdk-core';

class WebServiceClient extends BaseServiceClient {
  /**
   * @param {MethodDefinition} methodDescriptor
   * @param {InvokeRpcOptions} props
   * @returns {Request}
   */
  async invoke(methodDescriptor, props) {
    const serviceEndpoint = this._getServiceEndpoint();
    const host = serviceEndpoint.protocol + '//' + serviceEndpoint.host;
    const metadata = await this._enhanceMetadata(props.metadata);
    const requestProps = {
      ...props,
      host,
      metadata
    };
    return grpc.invoke(methodDescriptor, requestProps);
  }

  async _enhanceMetadata(metadata = new grpc.Metadata()) {
    if (!this._paymentChannelManagementStrategy) {
      return metadata;
    }

    const { channelId, nonce, signingAmount, signatureBytes } = await this._fetchPaymentMetadata();

    metadata.append('snet-payment-type', 'escrow');
    metadata.append('snet-payment-channel-id', `${channelId}`);
    metadata.append('snet-payment-channel-nonce', `${nonce}`);
    metadata.append('snet-payment-channel-amount', `${signingAmount}`);
    metadata.append('snet-payment-channel-signature-bin', signatureBytes.toString('base64'));
    return metadata;
  }

  _generatePaymentChannelStateServiceClient() {
    logger.debug(`Creating PaymentChannelStateService client`, { tags: ['gRPC']});
    const serviceEndpoint = this._getServiceEndpoint();
    logger.debug(`PaymentChannelStateService pointing to ${serviceEndpoint.host}, `, { tags: ['gRPC']});
    const host = serviceEndpoint.protocol + '//' + serviceEndpoint.host;
    return new PaymentChannelStateServiceClient(host);
  }

  _getChannelStateRequestMethodDescriptor() {
    return ChannelStateRequest;
  }
}

export default WebServiceClient;
