class Organization {
  /**
   * @param {MPEContract} mpeContract
   */
  constructor(mpeContract) {
    this._mpeContract = mpeContract;
  }

  /**
   * Creates a new organization in the blockchain
   * @param {string} orgId - The unique organization id
   * @param {string} orgMetadataURI - The ipfs URI for the organization metadata
   * @param {Array<string>} accounts - List of accounts of the members of the organization
   */
  async createOrganization(orgId, orgMetadataURI, accounts) {
    return await this._mpeContract.createOrganization(orgId, orgMetadataURI, accounts);
  }
}
