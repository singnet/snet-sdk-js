import { useState } from 'react';
import {
    getWalletInfo,
} from '../../helperFunctions/sdkCallFunctions';
import './styles.css';
import { isNull } from 'lodash';
import Model from './Model';
import Loader from "../Loader";
import FilterModels from '../FilterModels';

const TrainingModel = ({ serviceClient }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [models, setModels] = useState();
    const [trainingMetadata, setTrainingMetadata] = useState({isTrainingEnabled: false, hasTrainingInProto: false, trainingServicesAndMethods: []})

    const createModel = async () => {
        try {
            setIsLoading(true);
            console.log("trainingMetadata.grpcServiceMethod trainingMetadata.grpcServiceName: ",
            trainingMetadata.grpcServiceMethod,
            trainingMetadata.grpcServiceName);
            const { address } = await getWalletInfo();
            const params = {
                address,
                name: 'Model public',
                description: 'Model description',
                isPublic: true,
                address_list: ['0x6E7BaCcc00D69eab748eDf661D831cd2c7f3A4DF', '0x0709e9B78756B740ab0C64427f43f8305fD6D1A7'],
                grpcMethod: trainingMetadata.grpcServiceMethod,
                serviceName: trainingMetadata.grpcServiceName,
            };
            await serviceClient.createModel(
                params
            );
            await getAllModels();
        } catch (err) {
            console.log(err);
        } finally {
            setIsLoading(false);
        }
    };

    const getAllModels = async (filters = {}) => {
        try {
            setIsLoading(true);
            const { address } = await getWalletInfo();
            const params = {
                ...filters,
                isUnifiedSign: true, 
                address, 
            };
            const existingModels = await serviceClient.getAllModels(params);
            setModels(existingModels);
        } catch (err) {
            console.log(err);
        } finally {
            setIsLoading(false);
        }
    };


    const getMethodMetadataByMethod = async () => {
        try {
            setIsLoading(true);
            const params = {
                grpcMethod: trainingMetadata.grpcServiceMethod,
                serviceName: trainingMetadata.grpcServiceName,
            };
            const methodMetadata =  await serviceClient.getMethodMetadata(params);;
            console.log('method metadata by method: ', methodMetadata);
        } catch (err) {
            console.log(err);
        } finally {
            setIsLoading(false);
        }
    };

    const trainingActions = [
        {id: "createModel", label: "Create Model", action: createModel},
        {id: "getMethodMetadataByMethod", label: "Get Method Metadata", action: getMethodMetadataByMethod},
    ];

    const Models = () => {
        return (
            <div className='exciting-models-container'>
                <h2>Models</h2>
                <div className='exciting-models'>
                    {models.map((excitingModel, index) => (
                        <Model serviceClient={serviceClient} getAllModels={getAllModels} key={index} model={excitingModel} />
                    ))}
                </div>
            </div>
        );
    };

    const getTrainingMetadata = async () => {
        const serviceMetadata = await serviceClient.getServiceMetadata();
        console.log("getServiceMetadata: ", serviceMetadata);
        const grpcServiceName = Object.keys(serviceMetadata.trainingServicesAndMethods)[0];
        const grpcServiceMethod = serviceMetadata.trainingServicesAndMethods[grpcServiceName][0];
        setTrainingMetadata({...serviceMetadata, grpcServiceName, grpcServiceMethod});
    }
    
    if (isNull(trainingMetadata)) {
        return <h2>For this service training is not avalable</h2>
    }

    return (
        <div className='training-model-container'>
            <div className='button-group'>
                {!trainingMetadata.grpcServiceName && (
                    <button
                        disabled={isLoading}
                        onClick={getTrainingMetadata}
                    >
                        Get Training Provider
                    </button>
                )}
    
                <FilterModels
                    trainingMetadata={trainingMetadata}
                    onFilterApply={getAllModels}
                />
            </div>
            <div className='action-buttons'>
                {trainingActions.map(trainingAction => (
                    <button
                        key={trainingAction.id}
                        onClick={trainingAction.action}
                        disabled={isLoading} 
                    >
                        {trainingAction.label}
                    </button>
                ))}
            </div>
            {isLoading && <Loader isLoading={isLoading} />}
            <div className='models-container'>
                {models && <Models />}
            </div>
        </div>
    );
};

export default TrainingModel;