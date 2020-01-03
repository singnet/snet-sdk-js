class Organization {
  /**
   * @param {RegistryContract} registryContract
   */
  constructor(registryContract) {
    this._registryContract = registryContract;
  }

  /**
   * Creates a new organization in the blockchain
   * @param {string} orgId - The unique organization id
   * @param {string} orgMetadataURI - The IPFS URI for the organization metadata
   * @param {Array<string>} accounts - List of accounts of the members of the organization
   */
  async createOrganization(orgId, orgMetadataURI, accounts) {
    return await this._registryContract.createOrganization(orgId, orgMetadataURI, accounts);
  }
}

export default Organization;