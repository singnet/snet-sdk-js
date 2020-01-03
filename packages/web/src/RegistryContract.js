import RegistryAbi from "singularitynet-platform-contracts/abi/Registry";
import RegistryNetworks from "singularitynet-platform-contracts/networks/Registry";

class RegistryContract {
  constructor(web3, networkId) {
    this._web3 = web3;
    this._contract = new this._web3.eth.contract(RegistryAbi).at(RegistryNetworks[networkId].address);
  }

  /**
   * Creates a new organization in the blockchain
   * @param {string} orgId - The unique organization id
   * @param {string} orgMetadataURI - The IPFS URI for the organization metadata
   * @param {Array<string>} members - List of etherum addresses of the members of the organization
   */
  createOrganization(orgId, orgMetadataURI, members) {
    return new Promise((resolve, reject) => {
      this._contract.createOrganization(orgId, orgMetadataURI, [...members], (error, hash) => {
        if(error) {
          reject(error);
        }
        resolve(hash);
      });
    });
  }
}

export default RegistryContract;
