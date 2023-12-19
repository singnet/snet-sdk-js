import { find, map } from 'lodash';
import RegistryNetworks from 'singularitynet-platform-contracts/networks/Registry.json';
import RegistryAbi from 'singularitynet-platform-contracts/abi/Registry.json';
import { createHelia } from 'helia'; //import Helia
import { json as heliaJson } from '@helia/json';
import logger from './utils/logger';

export default class IPFSMetadataProvider {
  constructor(web3, networkId, ipfsEndpoint) {
    this._web3 = web3;
    this._networkId = networkId;
    this._ipfsEndpoint = ipfsEndpoint;
    this._helia = this._constructHeliaClient(); //initialize Helia
    this._heliaJson = heliaJson(this._helia);
    const registryAddress = RegistryNetworks[this._networkId].address;
    this._registryContract = new this._web3.eth.Contract(RegistryAbi, registryAddress);
  }

  /**
   * @param {string} orgId
   * @param {string} serviceId
   * @returns {Promise.<ServiceMetadata>}
   */
  async metadata(orgId, serviceId) {
    logger.debug(`Fetching service metadata [org: ${orgId} | service: ${serviceId}]`);
    const orgIdBytes = this._web3.utils.fromAscii(orgId);
    const serviceIdBytes = this._web3.utils.fromAscii(serviceId);
    const orgMetadata = await this._fetchOrgMetadata(orgIdBytes);
    const serviceMetadata = await this._fetchServiceMetadata(orgIdBytes, serviceIdBytes);
    return Promise.resolve(this._enhanceServiceGroupDetails(serviceMetadata, orgMetadata));
  }

  async _fetchOrgMetadata(orgIdBytes) {
    logger.debug('Fetching org metadata URI from registry contract');
    const { orgMetadataURI } = await this._registryContract.methods.getOrganizationById(orgIdBytes).call();

    return this._fetchMetadataFromIpfs(orgMetadataURI);
  }

  async _fetchServiceMetadata(orgIdBytes, serviceIdBytes) {
    logger.debug('Fetching service metadata URI from registry contract');
    const { metadataURI: serviceMetadataURI } = await this._registryContract
      .methods
      .getServiceRegistrationById(orgIdBytes, serviceIdBytes)
      .call();
    return this._fetchMetadataFromIpfs(serviceMetadataURI);
  }

  async _fetchMetadataFromIpfs(metadataURI) {
    const ipfsCID = `${this._web3.utils.hexToUtf8(metadataURI).substring(7)}`;
    logger.debug(`Fetching metadata from IPFS[CID: ${ipfsCID}]`);
    return await this._heliaJson.get(ipfsCID);
  }

  _enhanceServiceGroupDetails(serviceMetadata, orgMetadata) {
    const { groups: orgGroups } = orgMetadata;
    const { groups: serviceGroups } = serviceMetadata;

    const groups = map(serviceGroups, (group) => {
      const { group_name: serviceGroupName } = group;
      const orgGroup = find(orgGroups, ({ group_name: orgGroupName }) => orgGroupName === serviceGroupName);
      return {
        ...group,
        payment: orgGroup.payment,
      };
    });

    return { ...serviceMetadata, groups };
  }

  _constructHeliaClient() {
    // Initialize Helia client
    const heliaConfig = {
      // Helia-specific configuration
      // Add any additional Helia configurations here
      // This may include libp2p configuration, datastore, etc.
    };
    return createHelia(heliaConfig);
  }
}
