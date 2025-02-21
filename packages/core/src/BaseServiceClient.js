import url from 'url';
import { BigNumber } from 'bignumber.js';
import { isEmpty } from 'lodash';
import logger from './utils/logger';

import { toBNString } from './utils/bignumber_helper';
import { TRANSACTIONS_MESSAGE, UNIFIED_SIGN_EXPIRY, serviceStatus } from './constants/TrainingConstants';

class BaseServiceClient {
    /**
     * @param {SnetSDK} sdk
     * @param {String} orgId
     * @param {String} serviceId
     * @param {MPEContract} mpeContract
     * @param {ServiceMetadata} metadata
     * @param {Group} group
     * @param {DefaultPaymentStrategy} paymentChannelManagementStrategy
     * @param {ServiceClientOptions} [options={}]
     */
    constructor(sdk, orgId, serviceId, mpeContract, metadata, group, paymentChannelManagementStrategy, options = {}) {
      this._sdk = sdk;
      this._mpeContract = mpeContract;
      this._options = options;
      this._metadata = {
        orgId,
        serviceId,
        ...metadata
      };
      this._group = this._enhanceGroupInfo(group);
      this._paymentChannelManagementStrategy = paymentChannelManagementStrategy;
      this._paymentChannelStateServiceClient = this._generatePaymentChannelStateServiceClient();
      this._trainingServiceClient = this._generateTrainigServiceClient();
      this._paymentChannels = [];
      this.unifiedSigns = {};
    }
  
    /**
     * @type {Group}
     */
    get group() {
      return this._group;
    }
  
    /**
     * @type {Array.<PaymentChannel>}
     */
    get paymentChannels() {
      return this._paymentChannels;
    }
  
    /**
     * @type {ServiceMetadata}
     */
    get metadata() {
      return this._metadata;
    }
  
    /**
     * @type {GRPCClient}
     */
    get paymentChannelStateServiceClient() {
      return this._paymentChannelStateServiceClient;
    }
  
    /**
     * @type {MPEContract}
     */
    get mpeContract() {
      return this._mpeContract;
    }
  
    /**
     * @type {boolean}
     */
    get concurrencyFlag() {
      if (typeof this._options.concurrency === 'undefined') {
        return true;
      }
      return this._options.concurrency;
    }

    
    async _requestSignForModel(address, message) {
      const currentBlockNumber = await this._web3.eth.getBlockNumber();
      const signatureBytes = await this.account.signData(
        { t: 'string', v: message }, 
        { t: 'address', v: address },
        { t: 'uint256', v: currentBlockNumber }
      );
      return {
        currentBlockNumber,
        signatureBytes
      };
    }

    async _getUnifiedSign(address) {
      const keyOfUnofiedSign = address;
      const blockNumber = await this._web3.eth.getBlockNumber();

      if (this.unifiedSigns[keyOfUnofiedSign] && blockNumber - this.unifiedSigns[keyOfUnofiedSign]?.currentBlockNumber <= UNIFIED_SIGN_EXPIRY) {
        return this.unifiedSigns[keyOfUnofiedSign];
      }
      const {
        currentBlockNumber,
        signatureBytes
      } = await this._requestSignForModel(address, TRANSACTIONS_MESSAGE.UNIFIED_SIGN);
      this.unifiedSigns[keyOfUnofiedSign] = {
        currentBlockNumber,
        signatureBytes
      };
      return {
        currentBlockNumber,
        signatureBytes
      };
    }

    _getAuthorizationRequest(currentBlockNumber, message, signatureBytes, address) {
      const AuthorizationRequest = this._getAuthorizationRequestMethodDescriptor();
      const authorizationRequest = new AuthorizationRequest();

      authorizationRequest.setCurrentBlock(Number(currentBlockNumber));
      authorizationRequest.setMessage(message);
      authorizationRequest.setSignature(signatureBytes);
      authorizationRequest.setSignerAddress(address);

      return authorizationRequest;
    }

    async _getSignedAuthorizationRequest(address, message) {
        const {
          currentBlockNumber,
          signatureBytes
        } = await this._requestSignForModel(address, message);

      const authorizationRequest = this._getAuthorizationRequest(
        currentBlockNumber,
        message,
        signatureBytes,
        address
      );
      return authorizationRequest;
    }

    async _getUnifiedAuthorizationRequest(address) {
      const {
        currentBlockNumber,
        signatureBytes
      } = await this._getUnifiedSign(address);

      const authorizationRequest = this._getAuthorizationRequest(
        currentBlockNumber,
        TRANSACTIONS_MESSAGE.UNIFIED_SIGN,
        signatureBytes,
        address
      );
      return authorizationRequest;
    }

    async getMethodMetadata(params) {
        const request = this._methodMetadataRequest(params);

        return new Promise((resolve, reject) => {
          this._trainingServiceClient.get_method_metadata(request, (err, response) => {
            if (err) {
              reject(err);
            } else {
                const methodMetadata = {
                    defaultModelId: response.getDefaultModelId(),
                    maxModelsPerUser: response.getMaxModelsPerUser(),
                    datasetMaxSizeMb: response.getDatasetMaxSizeMb(),
                    datasetMaxCountFiles: response.getDatasetMaxCountFiles(),
                    datasetMaxSizeSingleFileMb: response.getDatasetMaxSizeSingleFileMb(),
                    datasetFilesType: response.getDatasetFilesType(),
                    datasetType: response.getDatasetType(),
                    datasetDescription: response.getDatasetDescription(),
                };
                resolve(methodMetadata);
            }
          });
        });
    }

    _methodMetadataRequest(params) {
        const ModelStateRequest = this._getMethodMetadataRequestMethodDescriptor();
        const modelStateRequest = new ModelStateRequest();

        if (params?.modelId) {
            modelStateRequest.setModelId(params.modelId);
            return modelStateRequest;
        }
        modelStateRequest.setGrpcMethodName(params.grpcMethod);
        modelStateRequest.setGrpcServiceName(params.serviceName);

        return modelStateRequest;
    }

    async getServiceMetadata() {
      const request = this._trainingMetadataRequest();
      return new Promise((resolve, reject) => {
        this._trainingServiceClient.get_training_metadata(request, (err, response) => {
          if (err) {
            reject(err);
          } else {
            const trainingmethodsMap = response.getTrainingmethodsMap().map_;
            const methodsMapKeys = Object.keys(trainingmethodsMap);
            const trainingServicesAndMethods = {};

            methodsMapKeys.forEach(methodsMapKey => {
                let trainingMethods = [];
                trainingmethodsMap[methodsMapKey].value.map(methodsArray => 
                    methodsArray.forEach(methods => 
                        methods.forEach(method => {
                            if (String(method)) {
                            trainingMethods.push(method);
                            }
                        })
                    )
                );
                trainingServicesAndMethods[methodsMapKey] = trainingMethods;
            });

            const isTrainingEnabled = response.getTrainingenabled();
            const hasTrainingInProto = response.getTraininginproto();
            resolve({
              isTrainingEnabled,
              hasTrainingInProto,
              trainingServicesAndMethods
            });
          }
        });
      });
    }

    _trainingMetadataRequest() {
      const ModelStateRequest = this._getTrainingMetadataRequestMethodDescriptor();
      const modelStateRequest = new ModelStateRequest();
      return modelStateRequest;
    }

    async getAllModels(params) {
      const request = await this._trainingStateRequest(params);
      return new Promise((resolve, reject) => {
        this._trainingServiceClient.get_all_models(request, (err, response) => {
          if (err) {
            reject(err);
          } else {
            const modelDetails = response.getListOfModelsList();
            const data = modelDetails.map(item => this._parseModelDetails(item));
            resolve(data);
          }
        });
      });
    }

    _parseModelDetails(modelDetails) {
        return {
            modelId: modelDetails.getModelId(),
            methodName: modelDetails.getGrpcMethodName(),
            serviceName: modelDetails.getGrpcServiceName(),
            description: modelDetails.getDescription(),
            status: serviceStatus[modelDetails.getStatus()],
            updatedDate: modelDetails.getUpdatedDate(),
            accessAddressList: modelDetails.getAddressListList(),
            modelName: modelDetails.getName(),
            publicAccess: modelDetails.getIsPublic(),
            dataLink: modelDetails.getTrainingDataLink(),
            updatedByAddress: modelDetails.getUpdatedByAddress()
          };
    }

    async getModel(params) {
        const request = await this._trainingGetModelStateRequest(params);
  
          return new Promise((resolve, reject) => {
              this._trainingServiceClient.get_model(
                  request,
                  (err, response) => {
                      if (err) {
                          reject(err);
                      } else {
                          const model = this._parseModelDetails(response);
                          resolve(model);
                      }
                  }
              );
          });
      }

    async getModelStatus(params) {
      const request = await this._trainingGetModelStateRequest(params);

        return new Promise((resolve, reject) => {
            this._trainingServiceClient.get_model(
                request,
                (err, response) => {
                    if (err) {
                        reject(err);
                    } else {
                        const modelStatus = serviceStatus[response.getStatus()];
                        resolve(modelStatus);
                    }
                }
            );
        });
    }

    async _trainingGetModelStateRequest(params) {
      const ModelStateRequest = this._getModelStatusRequestMethodDescriptor();
      const modelStateRequest = new ModelStateRequest();

      const message = TRANSACTIONS_MESSAGE.GET_MODEL;
      const authorizationRequest = params.isUnifiedSign ?
        await this._getUnifiedAuthorizationRequest(params.address)
        : await this._getSignedAuthorizationRequest(params.address, message);

      modelStateRequest.setAuthorization(authorizationRequest);
      modelStateRequest.setModelId(params.modelId);
      return modelStateRequest;
    }

    async getTrainModelPrice(params) {
        const request = await this._trainModelPriceRequest(params);
        return new Promise((resolve, reject) => {
          this._trainingServiceClient.train_model_price(request, (err, response) => {
            if (err) {
              reject(err);
            } else {
              const price = response.getPrice();
              resolve(price);
            }
          });
        });
      }
  
    async _trainModelPriceRequest(params) {
        const ModelStateRequest = this._getTrainModelPriceRequestMethodDescriptor();
        const modelStateRequest = new ModelStateRequest();

        const message = TRANSACTIONS_MESSAGE.TRAIN_MODEL_PRICE;
        const authorizationRequest = params.isUnifiedSign ?
          await this._getUnifiedAuthorizationRequest(params.address)
          : await this._getSignedAuthorizationRequest(params.address, message);

        modelStateRequest.setAuthorization(authorizationRequest);
        modelStateRequest.setModelId(params.modelId);
        return modelStateRequest;
    }

    async trainModel(params) {
        const request = await this._trainModelRequest(params);
        const amount = await this.getTrainModelPrice(params);
        const paymentMetadata = await this._generateTrainingPaymentMetadata(params.modelId, amount);

        return new Promise((resolve, reject) => {
          this._trainingServiceClient.train_model(request, paymentMetadata, (err, response) => {
            if (err) {
              reject(err);
            } else {
                const modelStatus = serviceStatus[response.getStatus()];
                resolve(modelStatus);
            }
          });
        });
      }
  
    async _trainModelRequest(params) {
        const message = TRANSACTIONS_MESSAGE.TRAIN_MODEL;
        const authorizationRequest = await this._getSignedAuthorizationRequest(params.address, message);

        const ModelStateRequest = this._getTrainModelRequestMethodDescriptor();
        const modelStateRequest = new ModelStateRequest();

        modelStateRequest.setAuthorization(authorizationRequest);
        modelStateRequest.setModelId(params.modelId);

        return modelStateRequest;
    }

    async getValidateModelPrice(params) {
      const request = await this._validateModelPriceRequest(params);
      return new Promise((resolve, reject) => {
        this._trainingServiceClient.validate_model_price(request, (err, response) => {
          if (err) {
            reject(err);
          } else {
            const price = response.getPrice();
            resolve(price);
          }
        });
      });
    }

    async _validateModelPriceRequest(params) {
      const message = TRANSACTIONS_MESSAGE.VALIDATE_MODEL_PRICE;
      const authorizationRequest = params.isUnifiedSign ?
        await this._getUnifiedAuthorizationRequest(params.address)
        : await this._getSignedAuthorizationRequest(params.address, message);

      const ModelStateRequest = this._getValidateModelPriceRequestMethodDescriptor();
      const modelStateRequest = new ModelStateRequest();
      
      modelStateRequest.setAuthorization(authorizationRequest);
      modelStateRequest.setModelId(params.modelId);
      modelStateRequest.setTrainingDataLink(params.trainingDataLink);

      return modelStateRequest;
    }

    async validateModel(params) {
      const request = await this._validateModelRequest(params);

      const amount = await this.getValidateModelPrice(params);
      const paymentMetadata = await this._generateTrainingPaymentMetadata(params.modelId, amount);

      return new Promise((resolve, reject) => {
        this._trainingServiceClient.validate_model(request, paymentMetadata, (err, response) => {
          if (err) {
            reject(err);
          } else {
            const status = serviceStatus[response.getStatus()];
            resolve(status);
          }
        });
      });
    }

    async _validateModelRequest(params) {
      const message = TRANSACTIONS_MESSAGE.VALIDATE_MODEL;
      const authorizationRequest = await this._getSignedAuthorizationRequest(params.address, message);

      const ModelStateRequest = this._getValidateModelRequestMethodDescriptor();
      const modelStateRequest = new ModelStateRequest();

      modelStateRequest.setAuthorization(authorizationRequest);
      modelStateRequest.setModelId(params.modelId);
      modelStateRequest.setTrainingDataLink(params.trainingDataLink);

      return modelStateRequest;
    }

    async _trainingStateRequest(params) {
      const ModelStateRequest = this._getAllModelRequestMethodDescriptor();
      const modelStateRequest = new ModelStateRequest();

      const message = TRANSACTIONS_MESSAGE.GET_ALL_MODELS;
      const authorizationRequest = params.isUnifiedSign ?
        await this._getUnifiedAuthorizationRequest(params.address)
        : await this._getSignedAuthorizationRequest(params.address, message);
      
      modelStateRequest.setAuthorization(authorizationRequest);
      params?.statuses.forEach(status => modelStateRequest.addStatuses(status));
      modelStateRequest.setIsPublic(params.isPublic);
      modelStateRequest.setGrpcServiceName(params?.serviceName);
      modelStateRequest.setGrpcMethodName(params?.grpcMethod);
      modelStateRequest.setName(params.name);
      modelStateRequest.setCreatedByAddress(params?.createdByAddress);
      modelStateRequest.setPageSize(params?.pageSize);
      modelStateRequest.setPage(params?.page);

      return modelStateRequest;
    }

    async createModel(params) {
      const request = await this._trainingCreateModel(params);
      return new Promise((resolve, reject) => {
        this._trainingServiceClient.create_model(request, (err, response) => {
          logger.debug(`create model ${err} ${response}`);
          if (err) {
            reject(err);
          } else {
            const data = {
              addressList: response.getAddressListList(),
              description: response.getDescription(),
              isPublic: response.getIsPublic(),
              modelId: response.getModelId(),
              modelName: response.getName(),
              status: serviceStatus[response.getStatus()],
              updatedDate: response.getUpdatedDate(),
              serviceName: response.getGrpcServiceName(),
              methodName: response.getGrpcMethodName()
            };
            resolve(data);
          }
        });
      });
    }

    async _trainingCreateModel(params) {
      const message = TRANSACTIONS_MESSAGE.CREATE_MODEL;
      const authorizationRequest = await this._getSignedAuthorizationRequest(params.address, message);

      const ModelStateRequest = this._getCreateModelRequestMethodDescriptor();
      const modelStateRequest = new ModelStateRequest();

      const NewModelRequest = this._getNewModelRequestMethodDescriptor();
      const newModelRequest = new NewModelRequest();
      
      newModelRequest.setName(params.name);
      newModelRequest.setGrpcMethodName(params.grpcMethod);
      newModelRequest.setGrpcServiceName(params.serviceName);
      newModelRequest.setDescription(params.description);
      newModelRequest.setIsPublic(params.isPublic);
      newModelRequest.setAddressListList(params.address_list);

      modelStateRequest.setAuthorization(authorizationRequest);
      modelStateRequest.setModel(newModelRequest);

      return modelStateRequest;
    }

    async deleteModel(params) {
      const request = await this._trainingDeleteModel(params);
      return new Promise((resolve, reject) => {
        this._trainingServiceClient.delete_model(request, (err, response) => {
          logger.debug(`delete model ${err} ${response}`);
          if (err) {
            reject(err);
          } else {
            const status = serviceStatus[response.getStatus()];
            resolve(status);
          }
        });
      });
    }

    async _trainingDeleteModel(params) {
      const message = TRANSACTIONS_MESSAGE.DELETE_MODEL;
      const authorizationRequest = await this._getSignedAuthorizationRequest(params.address, message);

      const ModelStateRequest = this._getDeleteModelRequestMethodDescriptor();
      const modelStateRequest = new ModelStateRequest();

      modelStateRequest.setAuthorization(authorizationRequest);
      modelStateRequest.setModelId(params.modelId);
      return modelStateRequest;
    }

    async updateModel(params) {
      const request = await this._trainingUpdateModel(params);
      return new Promise((resolve, reject) => {
        this._trainingServiceClient.update_model(request, (err, response) => {
          logger.debug(`update model ${err} ${response}`);
          if (err) {
            reject(err);
          } else {
            const updatedModel = this._parseModelDetails(response)
            resolve(updatedModel);
          }
        });
      });
    }

    async _trainingUpdateModel(params) {
      const message = TRANSACTIONS_MESSAGE.UPDATE_MODEL;
      const authorizationRequest = await this._getSignedAuthorizationRequest(params.address, message);

      const ModelStateRequest = this._getUpdateModelRequestMethodDescriptor();
      const modelStateRequest = new ModelStateRequest();
      
      modelStateRequest.setAuthorization(authorizationRequest);
      modelStateRequest.setModelName(params.modelName);
      modelStateRequest.setModelId(params.modelId);
      modelStateRequest.setDescription(params.description);
      modelStateRequest.addAddressList(params.addressList);

      return modelStateRequest;
    }
  
    /**
     * Fetches the latest channel state from the ai service daemon
     * @param channelId
     * @returns {Promise<ChannelStateReply>}
     */
    async getChannelState(channelId) {
      const channelStateRequest = await this._channelStateRequest(channelId);
      return new Promise((resolve, reject) => {
        this.paymentChannelStateServiceClient.getChannelState(channelStateRequest, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        });
      });
    }
  
    /**
     * @returns {Promise.<PaymentChannel[]>}
     */
    async loadOpenChannels() {
      const currentBlockNumber = await this._web3.eth.getBlockNumber();
      const newPaymentChannels = await this._mpeContract.getPastOpenChannels(this.account, this, this._lastReadBlock);
      logger.debug(`Found ${newPaymentChannels.length} payment channel open events`, {
        tags: ['PaymentChannel']
      });
      this._paymentChannels = [...this._paymentChannels, ...newPaymentChannels];
      this._lastReadBlock = currentBlockNumber;
      return this._paymentChannels;
    }
  
    /**
     * @returns {Promise.<PaymentChannel[]>}
     */
    async updateChannelStates() {
      logger.info('Updating payment channel states', {
        tags: ['PaymentChannel']
      });
      const currentChannelStatesPromise = this._paymentChannels.map(paymentChannel => paymentChannel.syncState());
      await Promise.all(currentChannelStatesPromise);
      return this._paymentChannels;
    }
  
    /**
     *
     * @param {BigNumber} amount
     * @param {BigNumber} expiry
     * @returns {Promise.<PaymentChannel>}
     */
    async openChannel(amount, expiry) {
      const newChannelReceipt = await this._mpeContract.openChannel(this.account, this, amount, expiry);
      return this._getNewlyOpenedChannel(newChannelReceipt);
    }
  
    /**
     * @param {BigNumber} amount
     * @param {BigNumber} expiry
     * @returns {Promise.<PaymentChannel>}
     */
    async depositAndOpenChannel(amount, expiry) {
      const newFundedChannelReceipt = await this._mpeContract.depositAndOpenChannel(this.account, this, amount, expiry);
      return this._getNewlyOpenedChannel(newFundedChannelReceipt);
    }
  
    /**
     * get the details of the service
     * @returns {ServiceDetails}
     */
    getServiceDetails() {
      return {
        orgId: this._metadata.orgId,
        serviceId: this._metadata.serviceId,
        groupId: this._group.group_id,
        groupIdInBytes: this._group.group_id_in_bytes,
        daemonEndpoint: this._getServiceEndpoint()
      };
    }
  
    /**
     * Get the configuration for the freecall
     * @returns {FreeCallConfig}
     */
    getFreeCallConfig() {
      return {
        email: this._options.email,
        tokenToMakeFreeCall: this._options.tokenToMakeFreeCall,
        tokenExpiryDateBlock: this._options.tokenExpirationBlock
      };
    }
  
    /**
     * find the current blocknumber
     * @returns {Promise<number>}
     */
    async getCurrentBlockNumber() {
      return this._web3.eth.getBlockNumber();
    }
  
    /**
     * @param {...(*|Object)} data
     * @param {string} data.(t|type) - Type of data. One of the following (string|uint256|int256|bool|bytes)
     * @param {string} data.(v|value) - Value
     * @returns {Promise<Buffer>} - Signed binary data
     * @see {@link https://web3js.readthedocs.io/en/1.0/web3-utils.html#soliditysha3|data}
     */
    async signData(...data) {
      return this.account.signData(...data);
    }
  
    /**
     * @returns {Promise<number>}
     */
    async defaultChannelExpiration() {
      const currentBlockNumber = await this._web3.eth.getBlockNumber();
      const paymentExpirationThreshold = this._getPaymentExpiryThreshold();
      return toBNString(currentBlockNumber) + paymentExpirationThreshold;
    }
    _getPaymentExpiryThreshold() {
      if (isEmpty(this._group)) {
        return 0;
      }
      const paymentExpirationThreshold = this._group.payment.payment_expiration_threshold;
      return paymentExpirationThreshold || 0;
    }
    _enhanceGroupInfo(group) {
      if (isEmpty(group)) {
        return group;
      }
      const {
        payment_address,
        payment_expiration_threshold
      } = group.payment;
      return {
        group_id_in_bytes: Buffer.from(group.group_id, 'base64'),
        ...group,
        payment_address,
        payment_expiration_threshold
      };
    }
    async _channelStateRequest(channelId) {
      const {
        currentBlockNumber,
        signatureBytes
      } = await this._channelStateRequestProperties(toBNString(channelId));
      const channelIdBytes = Buffer.alloc(4);
      channelIdBytes.writeUInt32BE(toBNString(channelId), 0);
      const ChannelStateRequest = this._getChannelStateRequestMethodDescriptor();
      const channelStateRequest = new ChannelStateRequest();
      channelStateRequest.setChannelId(channelIdBytes);
      channelStateRequest.setSignature(signatureBytes);
      channelStateRequest.setCurrentBlock(toBNString(currentBlockNumber));
      return channelStateRequest;
    }
    async _channelStateRequestProperties(channelId) {
      if (this._options.channelStateRequestSigner) {
        const {
          currentBlockNumber,
          signatureBytes
        } = await this._options.channelStateRequestSigner(channelId);
        return {
          currentBlockNumber,
          signatureBytes
        };
      }
      const currentBlockNumber = await this._web3.eth.getBlockNumber();
      const channelIdStr = toBNString(channelId);
      const signatureBytes = await this.account.signData(
        { t: 'string', v: '__get_channel_state'},
        { t: 'address', v: this._mpeContract.address},
        { t: 'uint256', v: channelIdStr},
        { t: 'uint256', v: currentBlockNumber}
      );
      return {
        currentBlockNumber,
        signatureBytes
      };
    }

    async getChannelParameters() {
      const channel = await this._paymentChannelManagementStrategy.selectChannel(this);
      const {
        channelId,
        state: {
          nonce,
          currentSignedAmount
        }
      } = channel;
      const signingAmount = currentSignedAmount.plus(this._pricePerServiceCall);
      const channelIdStr = toBNString(channelId);
      const nonceStr = toBNString(nonce);
      const signingAmountStr = toBNString(signingAmount);
      logger.info(`Using PaymentChannel[id: ${channelIdStr}] with nonce: ${nonceStr} and amount: ${signingAmountStr} and `, {
        tags: ['PaymentChannelManagementStrategy', 'gRPC']
      });
      const {
        signatureBytes
      } = await this._options.paidCallMetadataGenerator(channelId, signingAmount, nonce);
      return {
        signatureBytes,
        channelId,
        signingAmount,
        nonce
      };
    }

    async _fetchPaymentMetadata() {
      if (!this._options.paidCallMetadataGenerator) {
        return this._paymentChannelManagementStrategy.getPaymentMetadata(this);
      }
      logger.debug('Selecting PaymentChannel using the given strategy', {
        tags: ['PaypalPaymentMgmtStrategy, gRPC']
      });
      const {
        channelId,
        nonce,
        signingAmount,
        signatureBytes
      } = await this.getChannelParameters();
      const metadata = [
        {'snet-payment-type': 'escrow'},
        {'snet-payment-channel-id': `${channelId}`},
        {'snet-payment-channel-nonce': `${nonce}`},
        {'snet-payment-channel-amount': `${signingAmount}`},
        {'snet-payment-channel-signature-bin': signatureBytes.toString('base64')}
      ];
      return metadata;
    }

    async _getNewlyOpenedChannel(receipt) {
      const openChannels = await this._mpeContract.getPastOpenChannels(this.account, this, receipt.blockNumber, this);
      const newPaymentChannel = openChannels[0];
      logger.info(`New PaymentChannel[id: ${newPaymentChannel.channelId}] opened`);
      return newPaymentChannel;
    }
    get _web3() {
      return this._sdk.web3;
    }
  
    /**
     * @type {Account}
     */
    get account() {
      return this._sdk.account;
    }
    get _pricePerServiceCall() {
      const {
        pricing
      } = this.group;
      const fixedPricing = pricing.find(price => price.price_model === 'fixed_price');
      return new BigNumber(fixedPricing.price_in_cogs);
    }

    _getServiceEndpoint() {
      if (this._options.endpoint) {
        return url.parse(this._options.endpoint);
      }
      const {
        endpoints
      } = this.group;
      const endpoint = endpoints[0];
      logger.debug(`Service endpoint: ${endpoint}`, {
        tags: ['gRPC']
      });
      return endpoint && url.parse(endpoint);
    }

    _generatePaymentChannelStateServiceClient() {
      logger.error('_generatePaymentChannelStateServiceClient must be implemented in the sub classes');
    }

    _getChannelStateRequestMethodDescriptor() {
      logger.error('_getChannelStateRequestMethodDescriptor must be implemented in the sub classes');
    }

    _generateTrainigServiceClient() {
      logger.error('_generateTrainingStateServiceClient must be implemented in the sub classes');
    }

    _getAllModelRequestMethodDescriptor() {
      logger.error('_getAllModelRequestMethodDescriptor must be implemented in the sub classes');
    }

    _getAuthorizationRequestMethodDescriptor() {
      logger.error('_getAuthorizationRequestMethodDescriptor must be implemented in the sub classes');
    }

    _getValidateModelPriceRequestMethodDescriptor() {
      logger.error('_getValidateModelPriceRequestMethodDescriptor must be implemented in the sub classes');
    };

    _getTrainModelPriceRequestMethodDescriptor() {
        logger.error('_getTrainModelPriceRequestMethodDescriptor must be implemented in the sub classes');
      };

    _getTrainModelRequestMethodDescriptor() {
        logger.error('_getTrainModelRequestMethodDescriptor must be implemented in the sub classes');
      };

    _getValidateModelRequestMethodDescriptor() {
      logger.error('_getValidateModelRequestMethodDescriptor must be implemented in the sub classes');
    }

    _getTrainingMetadataRequestMethodDescriptor() {
      logger.error('_getTrainingMetadataRequestMethodDescriptor must be implemented in the sub classes');
    }

    _getMethodMetadataRequestMethodDescriptor() {
        logger.error('_getMethodMetadataRequestMethodDescriptor must be implemented in the sub classes');
      }

    _getNewModelRequestMethodDescriptor() {
      logger.error('_getNewModelRequestMethodDescriptor must be implemented in the sub classes');
    }

    _getModelStatusRequestMethodDescriptor() {
        logger.error('_getModelStatusRequestMethodDescriptor must be implemented in the sub classes');
      }

    _getCreateModelRequestMethodDescriptor() {
      logger.error('_getCreateModelRequestMethodDescriptor must be implemented in the sub classes');
    }

    _getDeleteModelRequestMethodDescriptor() {
      logger.error('_getDeleteModelRequestMethodDescriptor must be implemented in the sub classes');
    }

    _getUpdateModelRequestMethodDescriptor() {
      logger.error('_getUpdateModelRequestMethodDescriptor must be implemented in the sub classes');
    }

    _generateTrainingPaymentMetadata() {
        logger.error('_generateTrainingPaymentMetadata must be implemented in the sub classes');
    }

    get concurrencyManager() {
      logger.error('concurrencyManager must be implemented in the sub classes');
    }
  }

export default BaseServiceClient;
