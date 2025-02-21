import { useState } from 'react';
import {
    getWalletInfo,
} from '../../../helperFunctions/sdkCallFunctions';
import Table from "../../Table";
import Loader from '../../Loader';

const Model = ({ model, serviceClient, getAllModels }) => {
    const [isLoading, setIsLoading] = useState(false);

    const generateModelInfoMeta = (modelInfo) => {
        return [
            { title: 'accessAddressList', value: modelInfo.accessAddressList },
            { title: 'dataLink', value: modelInfo.dataLink },
            { title: 'description', value: modelInfo.description },
            { title: 'methodName', value: modelInfo.methodName },
            { title: 'modelId', value: modelInfo.modelId },
            { title: 'modelName', value: modelInfo.modelName },
            { title: 'publicAccess', value: String(modelInfo.publicAccess) },
            { title: 'serviceName', value: modelInfo.serviceName },
            { title: 'status', value: modelInfo.status },
            { title: 'updatedDate', value: modelInfo.updatedDate },
            { title: 'updatedByAddress', value: modelInfo.updatedByAddress },
        ];
    };

    const getMethodMetadataByModelId = async (model) => {
        setIsLoading(true);
        const params = {
            modelId: model.modelId,
        };
        const methodMetadata = await serviceClient.getMethodMetadata(params);
        console.log('method metadata by modelId: ', methodMetadata);
        setIsLoading(false);
    };

    const getValidatePrice = async (model) => {
        setIsLoading(true);
        const { address } = await getWalletInfo();
        const params = {
            isUnifiedSign: true,
            modelId: model.modelId,
            trainingDataLink: 
                "https://marketplace-user-uploads.s3.us-east-1.amazonaws.com/sandbox_feedback_production/test%40gmail.com_1738853632525_20221209101435_component.zip?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAXYSEM4MOOPJLNUDR%2F20250206%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250206T145354Z&X-Amz-Expires=600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEEcaCXVzLWVhc3QtMSJHMEUCIE1AGI6%2BjRT0e9XyYVtLNAEsT9qVFD1tox8YY4wzf1DkAiEAhXLLWJNLf4QfYcB7mbfR68nnftCW9GiHRd7ijR7iEhIq%2BgIIYBAEGgw1MzM3OTMxMzc0MzYiDG5H8TEgJcF0ZaKXRCrXAg7X3%2FMJyAXL23P5AFzR014z%2BMqmSZ8Q3IQKAABhVBuTpPcKljlgSaUUBRb6wC53SwGQr0Fqz9ugXqUBTb8i0EGq%2Fa9SKZVnvBU0SdeocbBDPd9a0arP11e7OG8YGmqMkMf%2Fp%2BdcoLHzeIhggIkpUn7DuvL6zQEhalzhFww1sR4fwU5AtnYxk%2BptG895qfV4kGFHVvRpZYjqAaRCLLfb6pIbMaPYR%2FEfGDjccqe1%2F6f78qiioBcJ5O7Xxe5W3D68BrvbBqeItHqDaE2AxMVqp2c3q%2BzefVxi2cw2CwHFbgnWatMh%2B5SQSg%2Bl0iX8cdDYgY1KFOO2RVqZvdAN84zrYaSNuHzgt%2BsSC6AQVuTJC5AV7v6LFsLhxLsYxQLUhZjuifChrHkQDfQf2lpq0ZZ7YVlMHajSeXevWnS9dYr0bwQ8q22zC53XWm%2FipL6pCDslesEeNbaHsOcwgZqTvQY6ngFQCPu%2BXLitqiZyU%2BqNfOSGgES%2BmF5rmUydE1JrROcLo7TOO7CK6frh4K11gdVdJaNUABXcxWcG2CgCE%2B0vJFns7nzMOq8Ynja5XIH2kzYnZQpqKwRVp0wtJndYVWvPOsiX%2B21UiefUOO1wHJXFsyW0vl9%2B%2BmXA4WbZunsi0nhiFDxNnDD%2F%2FdT9JGbyQNc5Dv0PDi6PmUERm7sAu3RPJw%3D%3D&X-Amz-Signature=975294ae053ceb3821b797a5d1f5c875db9cda6a2459843249786b25ef644742&X-Amz-SignedHeaders=host&x-id=PutObject",
            //model.trainingDataLink,
            address,
        };
        console.log("params: ", params);
        
        const validatedPriceInCogs = await serviceClient.getValidateModelPrice(params);
        console.log("validatedPrice: ", validatedPriceInCogs);
        setIsLoading(false);
        return validatedPriceInCogs;
    };

    const validateModel = async (model) => {
        setIsLoading(true);
        const { address } = await getWalletInfo();
        const params = {
            modelId: model.modelId,
            trainingDataLink: 
                "https://marketplace-user-uploads.s3.us-east-1.amazonaws.com/sandbox_feedback_production/test%40gmail.com_1738853632525_20221209101435_component.zip?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAXYSEM4MOOPJLNUDR%2F20250206%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250206T145354Z&X-Amz-Expires=600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEEcaCXVzLWVhc3QtMSJHMEUCIE1AGI6%2BjRT0e9XyYVtLNAEsT9qVFD1tox8YY4wzf1DkAiEAhXLLWJNLf4QfYcB7mbfR68nnftCW9GiHRd7ijR7iEhIq%2BgIIYBAEGgw1MzM3OTMxMzc0MzYiDG5H8TEgJcF0ZaKXRCrXAg7X3%2FMJyAXL23P5AFzR014z%2BMqmSZ8Q3IQKAABhVBuTpPcKljlgSaUUBRb6wC53SwGQr0Fqz9ugXqUBTb8i0EGq%2Fa9SKZVnvBU0SdeocbBDPd9a0arP11e7OG8YGmqMkMf%2Fp%2BdcoLHzeIhggIkpUn7DuvL6zQEhalzhFww1sR4fwU5AtnYxk%2BptG895qfV4kGFHVvRpZYjqAaRCLLfb6pIbMaPYR%2FEfGDjccqe1%2F6f78qiioBcJ5O7Xxe5W3D68BrvbBqeItHqDaE2AxMVqp2c3q%2BzefVxi2cw2CwHFbgnWatMh%2B5SQSg%2Bl0iX8cdDYgY1KFOO2RVqZvdAN84zrYaSNuHzgt%2BsSC6AQVuTJC5AV7v6LFsLhxLsYxQLUhZjuifChrHkQDfQf2lpq0ZZ7YVlMHajSeXevWnS9dYr0bwQ8q22zC53XWm%2FipL6pCDslesEeNbaHsOcwgZqTvQY6ngFQCPu%2BXLitqiZyU%2BqNfOSGgES%2BmF5rmUydE1JrROcLo7TOO7CK6frh4K11gdVdJaNUABXcxWcG2CgCE%2B0vJFns7nzMOq8Ynja5XIH2kzYnZQpqKwRVp0wtJndYVWvPOsiX%2B21UiefUOO1wHJXFsyW0vl9%2B%2BmXA4WbZunsi0nhiFDxNnDD%2F%2FdT9JGbyQNc5Dv0PDi6PmUERm7sAu3RPJw%3D%3D&X-Amz-Signature=975294ae053ceb3821b797a5d1f5c875db9cda6a2459843249786b25ef644742&X-Amz-SignedHeaders=host&x-id=PutObject",
            //model.trainingDataLink,
            address,
        };
        
        const validatedModel = await serviceClient.validateModel(params);
        console.log("validatedModel: ", validatedModel);
        setIsLoading(false);
    };

    const trainModel = async (model) => {
        try {
        setIsLoading(true);
        const { address } = await getWalletInfo();
        const params = {
            modelId: model.modelId,
            address,
        };
        
        const validatedModel = await serviceClient.trainModel(params);
        console.log("validatedModel: ", validatedModel);
        } catch (err) {
            console.error("error in training model: ", err);
        } finally {
            setIsLoading(false);
        }
    };

    const getTrainModelPrice = async (model) => {
        setIsLoading(true);
        const { address } = await getWalletInfo();
        const params = {
            isUnifiedSign: true,
            modelId: model.modelId,
            address,
        };
        const price = await serviceClient.getTrainModelPrice(params);
        console.log('getTrainModelPrice: ', price);
        setIsLoading(false);
    };
    
    const getModel = async (model) => {
        setIsLoading(true);
        const { address } = await getWalletInfo();
        const params = {
            isUnifiedSign: true,
            modelId: model.modelId,
            address,
        };
        const getedModel = await serviceClient.getModel(params);
        console.log('getModel: ', getedModel);
        setIsLoading(false);
    };

    const getModelStatus = async (model) => {
        setIsLoading(true);
        const { address } = await getWalletInfo();
        const params = {
            isUnifiedSign: true,
            modelId: model.modelId,
            address,
        };
        const newModelStatus = await serviceClient.getModelStatus(params);
        console.log('new model status: ', newModelStatus);
        setIsLoading(false);
    };

    const deleteModel = async (model) => {
        setIsLoading(true);
        const { address } = await getWalletInfo();
        const params = {
            modelId: model.modelId,
            address,
        };
        await serviceClient.deleteModel(params);
        await getAllModels();
        setIsLoading(false);
    };

    const updateModel = async (model) => {
        setIsLoading(true);
        const { address } = await getWalletInfo();
        const params = {
            modelId: model.modelId,
            address,
            modelName: model.modelName + '_update_model',
            description: model.trainingModelDescription,
            accessAddressList: [model.accessAddressList[0]],
        };
        console.log('updating model: ', params);

        await serviceClient.updateModel(params);
        await getAllModels();
        setIsLoading(false);
    };

    const modelActions = [
        {id: "getValidatePrice", label: "Get validate price", action: getValidatePrice},
        {id: "getTrainModelPrice", label: "Get train price", action: getTrainModelPrice},
        {id: "validateModel", label: "Validate model", action: validateModel},
        {id: "trainModel", label: "Train model", action: trainModel},
        {id: "getModelStatus", label: "Get model status", action: getModelStatus},
        {id: "getMethodMetadataByModelId", label: "Get method metadata by Model Id", action: getMethodMetadataByModelId},
        {id: "getModel", label: "Get model", action: getModel},
        {id: "updateModel", label: "Update model", action: updateModel},
        {id: "deleteModel", label: "Delete model", action: deleteModel},
    ]

    const modelInfoMeta = generateModelInfoMeta(model);

    return (
        <div className='model-container'>
            <Table tableData={modelInfoMeta} />
            <div className='model-buttons button-group'>
                {isLoading ? <Loader isLoading={isLoading}/> :
                    modelActions.map(modelAction => (
                        <button key={modelAction.id} disabled={isLoading} onClick={() => modelAction.action(model)}>
                            {modelAction.label}
                        </button>
                    ))
                }
            </div>
        </div>
    );
};

export default Model;