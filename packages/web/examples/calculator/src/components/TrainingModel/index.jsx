import { useState } from 'react';
import {
    getWalletInfo,
} from '../../helperFunctions/sdkCallFunctions';
import './styles.css';
import { isNull } from 'lodash';
import Model from './Model';
import Loader from "../Loader";
// import { PaidCallPaymentStrategy } from 'snet-sdk-web/payment_strategies';

// import { grpc } from "@improbable-eng/grpc-web";

const TrainingModel = ({ serviceClient }) => {
    const [isLoading, setIsLoading] = useState(false);
    // const [createdModel, setCreatedModel] = useState();
    const [excitingModels, setExcitingModels] = useState();
    const [trainingMetadata, setTrainingMetadata] = useState({isTrainingEnabled: false, hasTrainingInProto: false, trainingServicesAndMethods: []})


    // useEffect(() => {
    //     if (trainingMetadata) {
    //         return;
    //     }
    //     const fetchServiceTrainingDataAPI = async () => {
    //         try {
    //             const url = `${serviceEndpoint}heartbeat`;
    //             const response = await fetch(url);
    //             const trainingData = await response.json();
    //             setTrainingMetadata(trainingData?.trainingMethods[0]);
    //         } catch (error) {
    //             setTrainingMetadata(null);
    //         }
    //     };

    //     fetchServiceTrainingDataAPI();
    // }, [trainingMetadata])

    const createModel = async () => {
        try {
            setIsLoading(true);
            console.log("trainingMetadata.grpcServiceMethod trainingMetadata.grpcServiceName: ",
            trainingMetadata.grpcServiceMethod,
            trainingMetadata.grpcServiceName);
            const { address } = await getWalletInfo();
            const params = {
                address,
                name: 'Model not public',
                description: 'Model description',
                is_public: false,
                address_list: ['0x6E7BaCcc00D69eab748eDf661D831cd2c7f3A4DF', '0x0709e9B78756B740ab0C64427f43f8305fD6D1A7'],
                grpcMethod: trainingMetadata.grpcServiceMethod,
                serviceName: trainingMetadata.grpcServiceName,
            };
            await serviceClient.createModel(
                params
            );
            await getAllModels();
            // setCreatedModel(createdModel);
        } catch (err) {
            console.log(err);
        } finally {
            setIsLoading(false);
        }
    };

    const getAllModels = async () => {
        try {
            setIsLoading(true);
            const { address } = await getWalletInfo();
            const params = {
                grpcMethod: trainingMetadata.grpcServiceMethod,
                serviceName: trainingMetadata.grpcServiceName,
                name: "",
                statuses: [],
                isPublic: false,
                createdByAddress: "",
                pageSize: 2,
                page: 1,
                address,
            };
            const existingModels = await serviceClient.getAllModels(params);
            setExcitingModels(existingModels);
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
        {id: "getAllModels", label: "Get Existing Models", action: getAllModels},
        {id: "getMethodMetadataByMethod", label: "Get Method Metadata", action: getMethodMetadataByMethod},
    ];


    const ExcitingModels = () => {
        return (
            <div className='exciting-models-container'>
                <h2>Exciting models</h2>
                <div className='exciting-models'>
                    {excitingModels.map((excitingModel, index) => (
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
                {!trainingMetadata.grpcServiceName ? (
                    <button
                        disabled={!serviceClient || isLoading}
                        onClick={getTrainingMetadata}
                        
                    >
                        Get Training Provider
                    </button>
                ) : (
                    trainingActions.map(trainingAction => (
                        <button key={trainingAction.id} onClick={trainingAction.action}>
                            {trainingAction.label}
                        </button>
                    ))
                )}
            </div>
            {isLoading && <Loader isLoading={isLoading}/>}
            <div className='models-container'>
                {excitingModels && <ExcitingModels />}
            </div>
        </div>
    );
};

export default TrainingModel;
