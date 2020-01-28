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

  /**
   *
   * @param {string} orgId - Id of organization to update.
   * @param {string} orgMetadataURI -- The IPFS URI for the updated organization metadata
   */
  changeOrganizationMetadataURI(orgId, orgMetadataURI) {
    const enhancedOrgId = this._web3.utils.fromAscii(orgId);
    const enhancedOrgMetadataURI = this._web3.utils.fromAscii(orgMetadataURI);
    return this._contract.methods.changeOrganizationMetadataURI(enhancedOrgId, enhancedOrgMetadataURI);
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

  /**
   *
   * @param {string} orgId - The unique organization id
   * @param {string} serviceId - Id of the service to create, must be unique organization-wide.
   * @param {string} serviceMetadataURI - Service metadata. metadataURI should contain information for data consistency
   *                      validation (for example hash). We support: IPFS URI.
   * @param {string[]} tags - Optional array of tags for discoverability.
   */
  createServiceRegistration(orgId, serviceId, serviceMetadataURI, tags) {
    const enhancedOrgId = this._web3.utils.fromAscii(orgId);
    const enhancedServiceId = this._web3.utils.fromAscii(serviceId);
    const enhancedServiceMetadataURI = this._web3.utils.fromAscii(serviceMetadataURI);
    const enhancedTags = tags.map(tag => this.web3.utils.fromAscii(tag));
    return this._contract.methods.createServiceRegistration(
      enhancedOrgId,
      enhancedServiceId,
      enhancedServiceMetadataURI,
      enhancedTags
    );
  }

  /**
   *
   * @param {string} orgId - The unique organization id
   * @param {string} serviceId - Id of the service to update.
   * @param {string} serviceMetadataURI - Service metadata. metadataURI should contain information for data consistency
   *                      validation (for example hash). We support: IPFS URI.
   */
  updateServiceRegistration(orgId, serviceId, serviceMetadataURI) {
    const enhancedOrgId = this._web3.utils.fromAscii(orgId);
    const enhancedServiceId = this._web3.utils.fromAscii(serviceId);
    const enhancedServiceMetadataURI = this._web3.utils.fromAscii(serviceMetadataURI);
    return this._contract.methods.updateServiceRegistration(
      enhancedOrgId,
      enhancedServiceId,
      enhancedServiceMetadataURI
    );
  }

  /**
   *
   * @param {string} orgId -  The unique organization id
   * @param {string} serviceId - Id of the service to add tags to.
   * @param {string[]} tags - Array of tags to add to the service registration record.
   */
  addTagsToServiceRegistration(orgId, serviceId, tags) {
    const enhancedOrgId = this._web3.utils.fromAscii(orgId);
    const enhancedServiceId = this._web3.utils.fromAscii(serviceId);
    const enhancedTags = tags.map(tag => this.web3.utils.fromAscii(tag));
    return this._contract.methods.addTagsToServiceRegistration(enhancedOrgId, enhancedServiceId, enhancedTags);
  }

  /**
   *
   * @param {string} orgId - The unique organization id
   * @param {string} serviceId - Id of the service to remove tags from.
   * @param {string[]} tags - Array of tags to remove from the service registration record.
   */
  removeTagsFromServiceRegistration(orgId, serviceId, tags) {
    const enhancedOrgId = this._web3.utils.fromAscii(orgId);
    const enhancedServiceId = this._web3.utils.fromAscii(serviceId);
    const enhancedTags = tags.map(tag => this.web3.utils.fromAscii(tag));
    return this._contract.methods.removeTagsFromServiceRegistration(enhancedOrgId, enhancedServiceId, enhancedTags);
  }

  listOrganizations() {
    return this._contract.methods.listOrganizations();
  }

  /**
   *
   * @param {string} orgId - Id of the organization to look up.
   */
  getOrganizationById(orgId) {
    const enhancedOrgId = this._web3.utils.fromAscii(orgId);
    return this._contract.methods.getOrganizationById(enhancedOrgId);
  }
}

export default RegistryContract;
