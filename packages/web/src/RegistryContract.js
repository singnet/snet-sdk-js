import RegistryAbi from "singularitynet-platform-contracts/abi/Registry";
import RegistryNetworks from "singularitynet-platform-contracts/networks/Registry";

class RegistryContract {
  constructor(web3, networkId) {
    this._web3 = web3;
    this._contract = new this._web3.eth.Contract(RegistryAbi, RegistryNetworks[networkId].address);
  }

  /**
   * Creates a new organization in the blockchain
   * @param {string} orgId - The unique organization id
   * @param {string} orgMetadataURI - The IPFS URI for the organization metadata
   * @param {Array<string>} members - List of etherum addresses of the members of the organization
   */
  createOrganization(orgId, orgMetadataURI, members) {
    const enhancedOrgId = this._web3.utils.fromAscii(orgId);
    const enhancedOrgMetadataURI = this._web3.utils.fromAscii(orgMetadataURI);
    return this._contract.methods.createOrganization(enhancedOrgId, enhancedOrgMetadataURI, [...members]);
  }
}

export default RegistryContract;
