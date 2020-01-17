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
    return this._contract.methods.createOrganization(enhancedOrgId, enhancedOrgMetadataURI, [...members]).send();
  }

  /**
   * Add new members to the organization
   * @param {string} orgId - The unique organization id
   * @param {Array<string>} newMembers - List of ethereum addresses of the new members to be added to the organization
   */
  addOrganizationMembers(orgId, newMembers) {
    const enhancedOrgId = this._web3.utils.fromAscii(orgId);
    return this._contract.methods.addOrganizationMembers(enhancedOrgId, newMembers);
  }

  /**
   * Remove the existing members from the organization
   * @param {string} orgId - The unique organization id
   * @param {Array<string>} existingMembers - List of ethereum address of the members that has to be removed from the organization
   */
  removeOrganizationMembers(orgId, existingMembers) {
    const enhancedOrgId = this._web3.utils.fromAscii(orgId);
    return this._contract.methods.removeOrganizationMembers(enhancedOrgId, existingMembers);
  }
}

export default RegistryContract;
