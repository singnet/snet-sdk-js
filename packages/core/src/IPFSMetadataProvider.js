import { find, map } from 'lodash';
import url from 'url';
import RegistryNetworks from 'singularitynet-platform-contracts/networks/Registry.json';
import RegistryAbi from 'singularitynet-platform-contracts/abi/Registry.json';
import { get } from 'axios';
import {
    LIGHTHOUSE_ENDPOINT,
    STORAGE_TYPE_FILECOIN,
    STORAGE_TYPE_IPFS,
    STORAGE_URL_FILECOIN_PREFIX,
    STORAGE_URL_IPFS_PREFIX,
} from './constants/StorageConstants';

import logger from './utils/logger';

export default class IPFSMetadataProvider {
    constructor(web3, networkId, ipfsEndpoint) {
        this._web3 = web3;
        this._networkId = networkId;
        this._ipfsEndpoint = ipfsEndpoint;
        const registryAddress = RegistryNetworks[this._networkId].address;
        this._registryContract = new this._web3.eth.Contract(
            RegistryAbi,
            registryAddress
        );
        this._lighthouseEndpoint = LIGHTHOUSE_ENDPOINT;
        this._storageTypeIpfs = STORAGE_TYPE_IPFS;
        this._storageTypeFilecoin = STORAGE_TYPE_FILECOIN;
        this._storageUrlIpfsPrefix = STORAGE_URL_IPFS_PREFIX;
        this._storageUrlFilecoinPrefix = STORAGE_URL_FILECOIN_PREFIX;
    }

    /**
     * @param {string} orgId
     * @param {string} serviceId
     * @returns {Promise.<ServiceMetadata>}
     */
    async metadata(orgId, serviceId) {
        logger.debug(
            `Fetching service metadata [org: ${orgId} | service: ${serviceId}]`
        );
        let orgIdBytes = this._web3.utils.fromAscii(orgId);
        orgIdBytes = orgIdBytes.padEnd(66, '0'); // 66 = '0x' + 64 hex characters

        let serviceIdBytes = this._web3.utils.fromAscii(serviceId);
        serviceIdBytes = serviceIdBytes.padEnd(66, '0'); // 66 = '0x' + 64 hex characters

        const orgMetadata = await this._fetchOrgMetadata(orgIdBytes);
        const serviceMetadata = await this._fetchServiceMetadata(
            orgIdBytes,
            serviceIdBytes
        );
        return Promise.resolve(
            this._enhanceServiceGroupDetails(serviceMetadata, orgMetadata)
        );
    }

    async _fetchOrgMetadata(orgIdBytes) {
        logger.debug('Fetching org metadata URI from registry contract');
        const { orgMetadataURI } = await this._registryContract.methods
            .getOrganizationById(orgIdBytes)
            .call();

        return this._fetchMetadataFromIpfs(orgMetadataURI);
    }

    async _fetchServiceMetadata(orgIdBytes, serviceIdBytes) {
        logger.debug('Fetching service metadata URI from registry contract');
        const { metadataURI: serviceMetadataURI } =
            await this._registryContract.methods
                .getServiceRegistrationById(orgIdBytes, serviceIdBytes)
                .call();
        return this._fetchMetadataFromIpfs(serviceMetadataURI);
    }

    async _fetchMetadataFromIpfs(metadataURI) {
        let storageInfo = this._getStorageInfoFromURI(metadataURI);
        let storageTypeCID = storageInfo.uri;
        storageTypeCID = storageTypeCID.replace(/\0/g, '');
        logger.debug(
            `Fetching metadata from ${storageInfo.type} [CID: ${storageTypeCID}]`
        );
        try {
            let fetchUrl;
            if (storageInfo.type === this._storageTypeIpfs) {
                fetchUrl = `${this._ipfsEndpoint}/api/v0/cat?arg=${storageTypeCID}`;
            } else {
                fetchUrl = `${this._lighthouseEndpoint}/${storageTypeCID}`;
            }
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                throw response.error;
            }
            return response.json();
        } catch (error) {
            logger.debug(`Error fetching metadata from IPFS[CID: ${storageTypeCID}]`);
            throw error;
        }
    }

    _getStorageInfoFromURI(metadataURI) {
        const decodedUri = this._web3.utils.hexToUtf8(metadataURI);
        if (decodedUri.startsWith(STORAGE_URL_IPFS_PREFIX)) {
            return {
                type: this._storageTypeIpfs,
                uri: decodedUri.replace(this._storageUrlIpfsPrefix, ''),
            };
        } else if (decodedUri.startsWith(STORAGE_URL_FILECOIN_PREFIX)) {
            return {
                type: this._storageTypeFilecoin,
                uri: decodedUri.replace(this._storageUrlFilecoinPrefix, ''),
            };
        } else {
            throw new Error(
                `We support only ${this._storageTypeIpfs} and ${this._storageTypeFilecoin} uri in Registry`
            );
        }
    }

    _enhanceServiceGroupDetails(serviceMetadata, orgMetadata) {
        const { groups: orgGroups } = orgMetadata;
        const { groups: serviceGroups } = serviceMetadata;

        const groups = map(serviceGroups, (group) => {
            const { group_name: serviceGroupName } = group;
            const orgGroup = find(
                orgGroups,
                ({ group_name: orgGroupName }) =>
                    orgGroupName === serviceGroupName
            );
            return {
                ...group,
                payment: orgGroup.payment,
            };
        });

        return { ...serviceMetadata, groups };
    }

    _constructIpfsClient() {
        const {
            protocol = 'http',
            hostname: host,
            port = 5001,
        } = url.parse(this._ipfsEndpoint);
        const ipfsHostOrMultiaddr = {
            protocol: protocol.replace(':', ''),
            host,
            port,
        };
        return IPFSClient(ipfsHostOrMultiaddr);
    }
}
