import { grpc } from "@improbable-eng/grpc-web";
import { forOwn } from "lodash";
import {
  PaymentChannelStateService,
  PaymentChannelStateServiceClient,
} from "./proto/state_service_pb_service";
import { Daemon, DaemonClient } from "./proto/training_daemon_pb_service";
import training_daemon_pb from "./proto/training_daemon_pb";
import training_pb from "./proto/training_pb";
import { BaseServiceClient, logger } from "./sdk-core";
import { PaidCallPaymentStrategy } from "./payment_strategies";

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

  async _enhanceMetadataViaMetadataGenerator(metadata, methodDescriptor) {
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

  _enhanceMetadataDefault(metadata, paymentMetadata) {
    paymentMetadata.forEach((paymentMeta) => {
      Object.entries(paymentMeta).forEach(([key, value]) => {
        metadata.append(key, value);
      });
    });

    metadata.append("snet-payment-mpe-address", this._mpeContract.address);
    console.log("metadata", metadata);
    return metadata;
  }

  async _enhanceMetadata(metadata = new grpc.Metadata(), methodDescriptor) {
    if (this._options.disableBlockchainOperations) {
      return metadata;
    }

    if (this._options.metadataGenerator) {
      return await this._enhanceMetadataViaMetadataGenerator(metadata, methodDescriptor);
    }

    const paymentMetadata = await this._fetchPaymentMetadata();
    return this._enhanceMetadataDefault(metadata, paymentMetadata);
  }

  async _generateTrainingPaymentMetadata(modelId, amount) {
    let metadata = new grpc.Metadata();
    const paidCallPaymentStrategy = new PaidCallPaymentStrategy(this);
    const paymentMetadata = await paidCallPaymentStrategy.getTrainingPaymentMetadata(modelId, amount);
    
    this._enhanceMetadataDefault(metadata, paymentMetadata);
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
    return training_pb.NewModel;
  }

  _getAuthorizationRequestMethodDescriptor() { 
    return training_daemon_pb.AuthorizationDetails;
  };

}

export default WebServiceClient;
