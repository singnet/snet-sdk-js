import loadash from 'lodash';
import RegistryNetworks from 'singularitynet-platform-contracts/networks/Registry.json' assert { type: 'json' } ;
import RegistryAbi from "singularitynet-platform-contracts/abi/Registry.json" assert { type: "json" };;
import { createHelia } from 'helia';
import logger from './utils/logger';
import fetch from 'node-fetch'; 

export default class IPFSMetadataProvider {
  constructor(web3, networkId, ipfsEndpoint) {
    this._web3 = web3;
    this._networkId = networkId;
    this._ipfsEndpoint = ipfsEndpoint;
    this._helia =  this._constructHeliaClient();
    this._heliaJson = null 
    const registryAddress = RegistryNetworks[this._networkId].address;
    this._registryContract = new this._web3.eth.Contract(
      RegistryAbi,
      registryAddress,
    );
  }


  /**
   * @param {string} orgId
   * @param {string} serviceId
   * @returns {Promise.<serviceMetadata>}//Change from "ServiceMetadata" to "serviceMetaData"
   */
  async metadata(orgId, serviceId) {
    logger.debug(
      'Fetching service metadata [org: ${orgId} | service: ${serviceId}]',
    );
    // Convert to hex and pad with zeros to ensure 32 bytes
    let orgIdHex = this._web3.utils.asciiToHex(orgId);
    orgIdHex = orgIdHex.padEnd(66, '0'); // 66 = '0x' + 64 hex characters
    let serviceIdHex = this._web3.utils.asciiToHex(serviceId);
    serviceIdHex = serviceIdHex.padEnd(66, '0'); // 66 = '0x' + 64 hex characters
    const orgMetadata = await this._fetchOrgMetadata(orgIdHex);
    const serviceMetadata = await this._fetchServiceMetadata(
      orgIdHex,
      serviceIdHex,
    );

    return Promise.resolve(
      this._enhanceServiceGroupDetails(serviceMetadata, orgMetadata),
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
    const { metadataURI: serviceMetadataURI } = await this._registryContract.methods
      .getServiceRegistrationById(orgIdBytes, serviceIdBytes)
      .call();
    return this._fetchMetadataFromIpfs(serviceMetadataURI);
  }

  async _fetchMetadataFromIpfs(metadataURI) {
    let hexCID = this._web3.utils.hexToUtf8(metadataURI).substring(7);
    hexCID = hexCID.replace(/\0/g, '');
    try {
        const fetchUrl = `${this._ipfsEndpoint}/api/v0/cat?arg=${hexCID}`;
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.text(); 
        return JSON.parse(String(data));
      } catch (error) {
        logger.error('Error fetching data from IPFS:', error);
      }
  }

  _enhanceServiceGroupDetails(serviceMetadata, orgMetadata) {
    const { groups: orgGroups } = orgMetadata;
    const { groups: serviceGroups } = serviceMetadata;
    const groups = loadash.map(serviceGroups, (group) => {
      const { group_name: serviceGroupName } = group;
      const orgGroup = loadash.find(
        orgGroups,
        ({ group_name: orgGroupName }) => orgGroupName === serviceGroupName,
      );
      return {
        ...group,
        payment: orgGroup.payment,
      };
    });
    return { ...serviceMetadata, groups };
  }

  _constructHeliaClient() {
    logger.debug(`Constructing helia client`);
    const hclient = createHelia();
    return hclient;
  }
}