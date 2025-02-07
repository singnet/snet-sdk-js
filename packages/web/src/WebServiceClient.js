import { grpc } from "@improbable-eng/grpc-web";
import { forOwn } from "lodash";
import {
  PaymentChannelStateService,
  PaymentChannelStateServiceClient,
} from "./proto/state_service_pb_service";
import { Daemon, DaemonClient } from "./proto/training_daemon_pb_service";
import training_pb from "./proto/training_daemon_pb";
import trainingV2_pb from "./proto/training_v2_pb";
import { BaseServiceClient, logger } from "./sdk-core";

class WebServiceClient extends BaseServiceClient {
  /**
   * @param {MethodDescriptor} methodDescriptor
   * @param {InvokeRpcOptions} props
   * @returns {Request}
   */
  async invoke(methodDescriptor, props) {
    const requestProps = await this._generateRequestProps(
      methodDescriptor,
      props
    );
    return grpc.invoke(methodDescriptor, requestProps);
  }

  /**
   * @param {UnaryMethodDefinition} methodDescriptor
   * @param {UnaryRpcOptions} props
   * @returns {Request}
   */
  async unary(methodDescriptor, props) {
    const requestProps = await this._generateRequestProps(
      methodDescriptor,
      props
    );
    return grpc.unary(methodDescriptor, requestProps);
  }

  /**
   *
   * @param {UnaryMethodDefinition} methodDescriptor
   * @param {UnaryRpcOptions} props
   * @returns {Promise<UnaryRpcOptions>}
   * @private
   */
  async _generateRequestProps(methodDescriptor, props) {
    const serviceEndpoint = this._getServiceEndpoint();
    const host = `${serviceEndpoint.protocol}//${serviceEndpoint.host}`;
    const metadata = await this._enhanceMetadata(
      props.metadata,
      methodDescriptor
    );
    return {
      ...props,
      host,
      metadata,
    };
  }

  async _enhanceMetadata(metadata = new grpc.Metadata(), methodDescriptor) {
    if (this._options.disableBlockchainOperations) {
      return metadata;
    }

    if (this._options.metadataGenerator) {
      const { serviceName } = methodDescriptor.service;
      const { methodName } = methodDescriptor;
      const customMetadata = await this._options.metadataGenerator(
        this,
        serviceName,
        methodName
      );
      forOwn(customMetadata, (value, key) => {
        metadata.append(key, value);
      });
      return metadata;
    }

    // const { channelId, nonce, signingAmount, signatureBytes } = await this._fetchPaymentMetadata();
    // metadata.append('snet-payment-type', 'escrow');

    const paymentMetadata = await this._fetchPaymentMetadata();
    paymentMetadata.forEach((paymentMeta) => {
      Object.entries(paymentMeta).forEach(([key, value]) => {
        metadata.append(key, value);
      });
    });

    // metadata.append('snet-payment-channel-id', `${channelId}`);
    // metadata.append('snet-payment-channel-nonce', `${nonce}`);
    // metadata.append('snet-payment-channel-amount', `${signingAmount}`);
    // metadata.append('snet-payment-channel-signature-bin', signatureBytes.toString('base64'));
    metadata.append("snet-payment-mpe-address", this._mpeContract.address);
    console.log("metadata", metadata);
    return metadata;
  }

  _generatePaymentChannelStateServiceClient() {
    logger.debug("Creating PaymentChannelStateService client", {
      tags: ["gRPC"],
    });
    const serviceEndpoint = this._getServiceEndpoint();
    logger.debug(
      `PaymentChannelStateService pointing to ${serviceEndpoint.host}, `,
      { tags: ["gRPC"] }
    );
    const host = `${serviceEndpoint.protocol}//${serviceEndpoint.host}`;
    return new PaymentChannelStateServiceClient(host);
  }

  _getChannelStateRequestMethodDescriptor() {
    return PaymentChannelStateService.GetChannelState.requestType;
  }

  _generateTrainigServiceClient() {
    logger.debug("Creating TrainingStateService client", { tags: ["gRPC"] });
    const serviceEndpoint = this._getServiceEndpoint();
    logger.debug(
      `TrainingChannelStateService pointing to ${serviceEndpoint.host}, `,
      { tags: ["gRPC"] }
    );
    const host = `${serviceEndpoint.protocol}//${serviceEndpoint.host}`;
    return new DaemonClient(host);
  };

  _getAllModelRequestMethodDescriptor() {
    return Daemon.get_all_models.requestType;
  };
  
  _getTrainingMetadataRequestMethodDescriptor() {
    return Daemon.get_training_metadata.requestType;
  };

  _getMethodMetadataRequestMethodDescriptor() {
    return Daemon.get_method_metadata.requestType;
  };

  _getCreateModelRequestMethodDescriptor() {
    return Daemon.create_model.requestType;
  };

  _getDeleteModelRequestMethodDescriptor() {
    return Daemon.delete_model.requestType;
  };

  _getUpdateModelRequestMethodDescriptor() {
    return Daemon.update_model.requestType;
  };

  _getValidateModelPriceRequestMethodDescriptor() {
    return Daemon.validate_model_price.requestType;
  };

  _getTrainModelPriceRequestMethodDescriptor() {
    return Daemon.train_model_price.requestType;
  };

  _getTrainModelRequestMethodDescriptor() {
    return Daemon.train_model.requestType;
  };

  _getValidateModelRequestMethodDescriptor() {
    return Daemon.validate_model.requestType;
  }
  
  _getModelStatusRequestMethodDescriptor() {
    return Daemon.get_model.requestType;
  }

  _getNewModelRequestMethodDescriptor() {
    return trainingV2_pb.NewModel;
  }

  _getAuthorizationRequestMethodDescriptor() { 
    return training_pb.AuthorizationDetails;
  };

}

export default WebServiceClient;
