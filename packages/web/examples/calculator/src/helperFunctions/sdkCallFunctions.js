import serviceConfig from '../configs/serviceConfig';
import { initSDK } from '../configs/sdkConfig';

let sdk;

const getSDK = async () => {
    return sdk ? sdk : await initSDK();
};

export const getServiceClient = async () => {
    const sdk = await getSDK();
    const client = await sdk.createServiceClient(
        serviceConfig.orgID,
        serviceConfig.serviceID
    );
    return client;
};

export const getWalletInfo = async () => {
    const sdk = await getSDK();
    const address = await sdk.account.getAddress();
    const balance = await sdk.account.balance();
    const transactionCount = Number(await sdk.account._transactionCount());
    return { address, balance, transactionCount };
};
