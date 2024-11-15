import SnetSDK from 'snet-sdk-web';
import Web3 from 'web3';
import { isUndefined } from 'lodash';

const EXPECTED_ID_ETHEREUM_NETWORK = 11155111;

const ethereumMethods = {
    REQUEST_ACCOUNTS: 'eth_requestAccounts',
    REQUEST_CHAIN_ID: 'eth_chainId',
    REQUEST_SWITCH_CHAIN: 'wallet_switchEthereumChain',
    ON_ACCOUNT_CHANGE: 'accountsChanged',
    ON_NETWORK_CHANGE: 'chainChanged',
};


const detectEthereumNetwork = async () => {
    const chainIdHex = await web3Provider.request({
        method: ethereumMethods.REQUEST_CHAIN_ID,
        params: [],
    });
    const networkId = parseInt(chainIdHex);

    return networkId;
};

let web3Provider;
let sdk;

const isUserAtExpectedEthereumNetwork = async () => {
    const currentNetworkId = await detectEthereumNetwork();
    return Number(currentNetworkId) === EXPECTED_ID_ETHEREUM_NETWORK;
};

const switchNetwork = async () => {
    const web3 = new Web3(web3Provider);
    const hexifiedChainId = web3.utils.toHex(EXPECTED_ID_ETHEREUM_NETWORK);
    await web3Provider.request({
        method: ethereumMethods.REQUEST_SWITCH_CHAIN,
        params: [{ chainId: hexifiedChainId }],
    });
};

const updateSDK = async () => {
    const isExpectedNetwork = await isUserAtExpectedEthereumNetwork();
    if (!isExpectedNetwork) {
        await switchNetwork();
    }
    const snetConfig = {
        networkId: await detectEthereumNetwork(),
        web3Provider,
        defaultGasPrice: '4700000',
        defaultGasLimit: '210000',
    };
    sdk = new SnetSDK(snetConfig);
    await sdk.setupAccount();
};

const defineWeb3Provider = () => {
    if (isUndefined(window.ethereum)) {
        throw new Error('Metamask is not found');
    }
    web3Provider = window.ethereum;
};

export const initSDK = async () => {
    try {
        defineWeb3Provider();
        await web3Provider.request({
            method: ethereumMethods.REQUEST_ACCOUNTS,
        });
        await updateSDK();
        return sdk;
    } catch (error) {
        throw error;
    }
};
