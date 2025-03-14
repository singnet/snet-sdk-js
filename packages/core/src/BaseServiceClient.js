import url from 'url';
import { BigNumber } from 'bignumber.js';
import { find, first, isEmpty, map } from 'lodash';
import logger from './utils/logger';

import { toBNString } from './utils/bignumber_helper';

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
    constructor(
        sdk,
        orgId,
        serviceId,
        mpeContract,
        metadata,
        group,
        paymentChannelManagementStrategy,
        options = {}
    ) {
        this._sdk = sdk;
        this._mpeContract = mpeContract;
        this._options = options;
        this._metadata = { orgId, serviceId, ...metadata };
        this._group = this._enhanceGroupInfo(group);
        this._paymentChannelManagementStrategy =
            paymentChannelManagementStrategy;
        this._paymentChannelStateServiceClient =
            this._generatePaymentChannelStateServiceClient();
        this._modelServiceClient = this._generateModelServiceClient();
        this._paymentChannels = [];
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

    async getModelStatus(params) {
        const request = await this._trainingStatusStateRequest(params);

        return new Promise((resolve, reject) => {
            this._modelServiceClient.get_model_status(
                request,
                (err, response) => {
                    if (err) {
                        reject(err);
                    } else {
                        const modelStatus = response.getStatus();
                        resolve(modelStatus);
                    }
                }
            );
        });
    }

    async _trainingStatusStateRequest(params) {
        const message = '__get_model_status';
        const { currentBlockNumber, signatureBytes } =
            await this._requestSignForModel(params.address, message);

        const ModelStateRequest = this._getUpdateModelRequestMethodDescriptor();
        const modelStateRequest = new ModelStateRequest();

        const ModelDetailsRequest =
            this._getModelDetailsRequestMethodDescriptor();
        const modelDetailsRequest = new ModelDetailsRequest();

        modelDetailsRequest.setModelId(params.modelId);
        modelDetailsRequest.setGrpcMethodName(params.method);
        modelDetailsRequest.setGrpcServiceName(params.name);

        const AuthorizationRequest =
            this._getAuthorizationRequestMethodDescriptor();
        const authorizationRequest = new AuthorizationRequest();

        authorizationRequest.setCurrentBlock(Number(currentBlockNumber));
        authorizationRequest.setMessage(message);
        authorizationRequest.setSignature(signatureBytes);
        authorizationRequest.setSignerAddress(params.address);

        modelStateRequest.setAuthorization(authorizationRequest);
        modelStateRequest.setUpdateModelDetails(modelDetailsRequest);
        return modelStateRequest;
    }

    async getExistingModel(params) {
        const request = await this._trainingStateRequest(params);
        request;

        return new Promise((resolve, reject) => {
            this._modelServiceClient.get_all_models(
                request,
                (err, response) => {
                    if (err) {
                        reject(err);
                    } else {
                        const modelDetails = response.getListOfModelsList();

                        const data = modelDetails.map((item) => {
                            return {
                                modelId: item.getModelId(),
                                methodName: item.getGrpcMethodName(),
                                serviceName: item.getGrpcServiceName(),
                                description: item.getDescription(),
                                status: item.getStatus(),
                                updatedDate: item.getUpdatedDate(),
                                addressList: item.getAddressListList(),
                                modelName: item.getModelName(),
                                publicAccess: item.getIsPubliclyAccessible(),
                                dataLink: item.getTrainingDataLink(),
                            };
                        });
                        resolve(data);
                    }
                }
            );
        });
    }

    async _trainingStateRequest(params) {
        const message = '__get_existing_model';
        const { currentBlockNumber, signatureBytes } =
            await this._requestSignForModel(params.address, message);
        const ModelStateRequest = this._getModelRequestMethodDescriptor();
        const modelStateRequest = new ModelStateRequest();
        modelStateRequest.setGrpcMethodName(params.grpcMethod);
        modelStateRequest.setGrpcServiceName(params.grpcService);

        const AuthorizationRequest =
            this._getAuthorizationRequestMethodDescriptor();
        const authorizationRequest = new AuthorizationRequest();

        authorizationRequest.setCurrentBlock(Number(currentBlockNumber));
        authorizationRequest.setMessage(message);
        authorizationRequest.setSignature(signatureBytes);
        authorizationRequest.setSignerAddress(params.address);

        modelStateRequest.setAuthorization(authorizationRequest);
        return modelStateRequest;
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
            signatureBytes,
        };
    }

    async createModel(address, params) {
        const request = await this._trainingCreateModel(address, params);
        return new Promise((resolve, reject) => {
            this._modelServiceClient.create_model(request, (err, response) => {
                logger.debug(`create model ${err} ${response}`);
                if (err) {
                    reject(err);
                } else {
                    const modelDetails = response.getModelDetails();

                    const data = {
                        modelId: modelDetails.getModelId(),
                        methodName: modelDetails.getGrpcMethodName(),
                        serviceName: modelDetails.getGrpcServiceName(),
                        description: modelDetails.getDescription(),
                        status: modelDetails.getStatus(),
                        updatedDate: modelDetails.getUpdatedDate(),
                        addressList: modelDetails.getAddressListList(),
                        modelName: modelDetails.getModelName(),
                        publicAccess: modelDetails.getIsPubliclyAccessible(),
                        dataLink: modelDetails.getTrainingDataLink(),
                    };
                    resolve(data);
                }
            });
        });
    }

    async _trainingCreateModel(address, params) {
        const message = '__create_model';
        const { currentBlockNumber, signatureBytes } =
            await this._requestSignForModel(address, message);
        const ModelStateRequest = this._getCreateModelRequestMethodDescriptor();
        const modelStateRequest = new ModelStateRequest();

        const AuthorizationRequest =
            this._getAuthorizationRequestMethodDescriptor();
        const authorizationRequest = new AuthorizationRequest();
        const ModelDetailsRequest =
            this._getModelDetailsRequestMethodDescriptor();

        const { orgId, serviceId, groupId } = this.getServiceDetails();
        const modelDetailsRequest = new ModelDetailsRequest();
        authorizationRequest.setCurrentBlock(Number(currentBlockNumber));
        authorizationRequest.setMessage(message);
        authorizationRequest.setSignature(signatureBytes);
        authorizationRequest.setSignerAddress(address);

        modelDetailsRequest.setModelName(params.modelName);
        modelDetailsRequest.setGrpcMethodName(params.method);
        modelDetailsRequest.setGrpcServiceName(params.serviceName);
        modelDetailsRequest.setDescription(params.description);
        modelDetailsRequest.setIsPubliclyAccessible(params.publicAccess);
        modelDetailsRequest.setAddressListList(params.address);
        modelDetailsRequest.setTrainingDataLink(params.dataLink);

        modelDetailsRequest.setOrganizationId(orgId);
        modelDetailsRequest.setServiceId(serviceId);
        modelDetailsRequest.setGroupId(groupId);

        modelStateRequest.setAuthorization(authorizationRequest);
        modelStateRequest.setModelDetails(modelDetailsRequest);
        return modelStateRequest;
    }

    async deleteModel(params) {
        const request = await this._trainingDeleteModel(params);
        return new Promise((resolve, reject) => {
            this._modelServiceClient.delete_model(request, (err, response) => {
                logger.debug(`delete model ${err} ${response}`);
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    }

    async _trainingDeleteModel(params) {
        const message = '__delete_model';
        const { currentBlockNumber, signatureBytes } =
            await this._requestSignForModel(params.address, message);

        const ModelStateRequest = this._getUpdateModelRequestMethodDescriptor();
        const modelStateRequest = new ModelStateRequest();

        const AuthorizationRequest =
            this._getAuthorizationRequestMethodDescriptor();
        const authorizationRequest = new AuthorizationRequest();
        const ModelDetailsRequest =
            this._getModelDetailsRequestMethodDescriptor();
        const modelDetailsRequest = new ModelDetailsRequest();

        authorizationRequest.setCurrentBlock(Number(currentBlockNumber));
        authorizationRequest.setMessage(message);
        authorizationRequest.setSignature(signatureBytes);
        authorizationRequest.setSignerAddress(params.address);
        modelDetailsRequest.setModelId(params.modelId);
        modelDetailsRequest.setGrpcMethodName(params.method);
        modelDetailsRequest.setGrpcServiceName(params.name);

        modelStateRequest.setAuthorization(authorizationRequest);
        modelStateRequest.setUpdateModelDetails(modelDetailsRequest);
        return modelStateRequest;
    }

    async updateModel(params) {
        const request = await this._trainingUpdateModel(params);
        return new Promise((resolve, reject) => {
            this._modelServiceClient.update_model_access(
                request,
                (err, response) => {
                    logger.debug(`update model ${err} ${response}`);
                    if (err) {
                        reject(err);
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    }

    async _trainingUpdateModel(params) {
        const message = '__update_model';
        const { currentBlockNumber, signatureBytes } =
            await this._requestSignForModel(params.address, message);

        const ModelStateRequest = this._getUpdateModelRequestMethodDescriptor();
        const modelStateRequest = new ModelStateRequest();

        const AuthorizationRequest =
            this._getAuthorizationRequestMethodDescriptor();
        const authorizationRequest = new AuthorizationRequest();
        const ModelDetailsRequest =
            this._getModelDetailsRequestMethodDescriptor();
        const modelDetailsRequest = new ModelDetailsRequest();

        authorizationRequest.setCurrentBlock(Number(currentBlockNumber));
        authorizationRequest.setMessage(message);
        authorizationRequest.setSignature(signatureBytes);
        authorizationRequest.setSignerAddress(params.address);
        modelDetailsRequest.setModelId(params.modelId);
        modelDetailsRequest.setGrpcMethodName(params.method);
        modelDetailsRequest.setGrpcServiceName(params.name);
        modelDetailsRequest.setModelName(params.modelName);
        modelDetailsRequest.setDescription(params.description);
        modelDetailsRequest.setAddressListList(params.addressList);
        modelDetailsRequest.setStatus(params.status);
        modelDetailsRequest.setUpdatedDate(params.updatedDate);
        modelDetailsRequest.setIsPubliclyAccessible(params.publicAccess);
        modelDetailsRequest.setTrainingDataLink(params.dataLink);

        const { orgId, serviceId, groupId } = this.getServiceDetails();
        modelDetailsRequest.setOrganizationId(orgId);
        modelDetailsRequest.setServiceId(serviceId);
        modelDetailsRequest.setGroupId(groupId);

        modelStateRequest.setAuthorization(authorizationRequest);
        modelStateRequest.setUpdateModelDetails(modelDetailsRequest);
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
            this.paymentChannelStateServiceClient.getChannelState(
                channelStateRequest,
                (err, response) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    }

    /**
     * @returns {Promise.<PaymentChannel[]>}
     */
    async loadOpenChannels() {
        const currentBlockNumber = await this._web3.eth.getBlockNumber();
        const newPaymentChannels = await this._mpeContract.getPastOpenChannels(
            this.account,
            this,
            this._lastReadBlock
        );
        logger.debug(
            `Found ${newPaymentChannels.length} payment channel open events`,
            { tags: ['PaymentChannel'] }
        );
        this._paymentChannels = [
            ...this._paymentChannels,
            ...newPaymentChannels,
        ];
        this._lastReadBlock = currentBlockNumber;
        return this._paymentChannels;
    }

    /**
     * @returns {Promise.<PaymentChannel[]>}
     */
    async updateChannelStates() {
        logger.info('Updating payment channel states', {
            tags: ['PaymentChannel'],
        });
        const currentChannelStatesPromise = map(
            this._paymentChannels,
            (paymentChannel) => paymentChannel.syncState()
        );
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
        const newChannelReceipt = await this._mpeContract.openChannel(
            this.account,
            this,
            amount,
            expiry
        );
        return this._getNewlyOpenedChannel(newChannelReceipt);
    }

    /**
     * @param {BigNumber} amount
     * @param {BigNumber} expiry
     * @returns {Promise.<PaymentChannel>}
     */
    async depositAndOpenChannel(amount, expiry) {
        const newFundedChannelReceipt =
            await this._mpeContract.depositAndOpenChannel(
                this.account,
                this,
                amount,
                expiry
            );
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
            daemonEndpoint: this._getServiceEndpoint(),
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
            tokenExpiryDateBlock: this._options.tokenExpirationBlock,
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
        const paymentExpirationThreshold =
            this._group.payment.payment_expiration_threshold;
        return paymentExpirationThreshold || 0;
    }

    _enhanceGroupInfo(group) {
        if (isEmpty(group)) {
            return group;
        }

        const { payment_address, payment_expiration_threshold } = group.payment;

        return {
            group_id_in_bytes: Buffer.from(group.group_id, 'base64'),
            ...group,
            payment_address,
            payment_expiration_threshold,
        };
    }

    async _channelStateRequest(channelId) {
        const { currentBlockNumber, signatureBytes } =
            await this._channelStateRequestProperties(toBNString(channelId));
        const channelIdBytes = Buffer.alloc(4);
        channelIdBytes.writeUInt32BE(toBNString(channelId), 0);

        const ChannelStateRequest =
            this._getChannelStateRequestMethodDescriptor();
        const channelStateRequest = new ChannelStateRequest();
        channelStateRequest.setChannelId(channelIdBytes);
        channelStateRequest.setSignature(signatureBytes);
        channelStateRequest.setCurrentBlock(toBNString(currentBlockNumber));
        return channelStateRequest;
    }

    async _channelStateRequestProperties(channelId) {
        if (this._options.channelStateRequestSigner) {
            const { currentBlockNumber, signatureBytes } =
                await this._options.channelStateRequestSigner(channelId);
            return { currentBlockNumber, signatureBytes };
        }
        const currentBlockNumber = await this._web3.eth.getBlockNumber();
        const channelIdStr = toBNString(channelId);
        const signatureBytes = await this.account.signData(
            { t: 'string', v: '__get_channel_state' },
            { t: 'address', v: this._mpeContract.address },
            { t: 'uint256', v: channelIdStr },
            { t: 'uint256', v: currentBlockNumber }
        );

        return { currentBlockNumber, signatureBytes };
    }

    async _fetchPaymentMetadata() {
        if (this._options.paidCallMetadataGenerator) {
            logger.debug('Selecting PaymentChannel using the given strategy', {
                tags: ['PaypalPaymentMgmtStrategy, gRPC'],
            });
            const channel =
                await this._paymentChannelManagementStrategy.selectChannel(
                    this
                );
            const {
                channelId,
                state: { nonce, currentSignedAmount },
            } = channel;
            const signingAmount = currentSignedAmount.plus(
                this._pricePerServiceCall
            );
            const channelIdStr = toBNString(channelId);
            const nonceStr = toBNString(nonce);
            const signingAmountStr = toBNString(signingAmount);
            logger.info(
                `Using PaymentChannel[id: ${channelIdStr}] with nonce: ${nonceStr} and amount: ${signingAmountStr} and `,
                { tags: ['PaymentChannelManagementStrategy', 'gRPC'] }
            );
            const { signatureBytes } =
                await this._options.paidCallMetadataGenerator(
                    channelId,
                    signingAmount,
                    nonce
                );
            const metadata = [
                { 'snet-payment-type': 'escrow' },
                { 'snet-payment-channel-id': `${channelId}` },
                { 'snet-payment-channel-nonce': `${nonce}` },
                { 'snet-payment-channel-amount': `${signingAmount}` },
                {
                    'snet-payment-channel-signature-bin':
                        signatureBytes.toString('base64'),
                },
            ];
            return metadata;
        }
        return this._paymentChannelManagementStrategy.getPaymentMetadata(this);

        // NOTE: Moved channel selection logic to payment strategy
        //
        //
        // logger.debug('Selecting PaymentChannel using the given strategy', { tags: ['PaymentChannelManagementStrategy, gRPC'] });
        // const channel = await this._paymentChannelManagementStrategy.selectChannel(this);
        //
        // const { channelId, state: { nonce, currentSignedAmount } } = channel;
        // const signingAmount = currentSignedAmount.plus(this._pricePerServiceCall);
        // const channelIdStr = toBNString(channelId);
        // const nonceStr = toBNString(nonce);
        // const signingAmountStr = toBNString(signingAmount);
        // logger.info(`Using PaymentChannel[id: ${channelIdStr}] with nonce: ${nonceStr} and amount: ${signingAmountStr} and `, { tags: ['PaymentChannelManagementStrategy', 'gRPC'] });
        //
        // if(this._options.paidCallMetadataGenerator) {
        //   const { signatureBytes } = await this._options.paidCallMetadataGenerator(channelId, signingAmount, nonce);
        //   return {
        //     channelId, nonce, signingAmount, signatureBytes,
        //   };
        // }
        //
        // const signatureBytes = await this.account.signData(
        //   { t: 'string', v: '__MPE_claim_message' },
        //   { t: 'address', v: this._mpeContract.address },
        //   { t: 'uint256', v: channelIdStr },
        //   { t: 'uint256', v: nonceStr },
        //   { t: 'uint256', v: signingAmountStr },
        // );
        //
        // return {
        //   channelId, nonce, signingAmount, signatureBytes,
        // };
    }

    async _getNewlyOpenedChannel(receipt) {
        const openChannels = await this._mpeContract.getPastOpenChannels(
            this.account,
            this,
            receipt.blockNumber,
            this
        );
        const newPaymentChannel = openChannels[0];
        logger.info(
            `New PaymentChannel[id: ${newPaymentChannel.channelId}] opened`
        );
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
        const { pricing } = this.group;
        const fixedPricing = find(
            pricing,
            ({ price_model }) => price_model === 'fixed_price'
        );

        return new BigNumber(fixedPricing.price_in_cogs);
    }

    _getServiceEndpoint() {
        if (this._options.endpoint) {
            return url.parse(this._options.endpoint);
        }

        const { endpoints } = this.group;
        const endpoint = first(endpoints);
        logger.debug(`Service endpoint: ${endpoint}`, { tags: ['gRPC'] });

        return endpoint && url.parse(endpoint);
    }

    _generatePaymentChannelStateServiceClient() {
        logger.error(
            '_generatePaymentChannelStateServiceClient must be implemented in the sub classes'
        );
    }

    _getChannelStateRequestMethodDescriptor() {
        logger.error(
            '_getChannelStateRequestMethodDescriptor must be implemented in the sub classes'
        );
    }

    _generateModelServiceClient() {
        logger.error(
            '_generateTrainingStateServiceClient must be implemented in the sub classes'
        );
    }

    _getModelRequestMethodDescriptor() {
        logger.error(
            '_getModelRequestMethodDescriptor must be implemented in the sub classes'
        );
    }
    _getAuthorizationRequestMethodDescriptor() {
        logger.error(
            '_getAuthorizationRequestMethodDescriptor must be implemented in the sub classes'
        );
    }

    _getCreateModelRequestMethodDescriptor() {
        logger.error(
            '_getCreateModelRequestMethodDescriptor must be implemented in the sub classes'
        );
    }

    _getDeleteModelRequestMethodDescriptor() {
        logger.error(
            '_getDeleteModelRequestMethodDescriptor must be implemented in the sub classes'
        );
    }

    _getUpdateModelRequestMethodDescriptor() {
        logger.error(
            '__getUpdateModelRequestMethodDescriptor must be implemented in the sub classes'
        );
    }

    _getModelDetailsRequestMethodDescriptor() {
        logger.error(
            '_getModelDetailsRequestMethodDescriptor must be implemented in the sub classes'
        );
    }

    get concurrencyManager() {
        logger.error(
            'concurrencyManager must be implemented in the sub classes'
        );
    }
}

export default BaseServiceClient;
