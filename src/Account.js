import AGITokenAbi from 'singularitynet-token-contracts/abi/SingularityNetToken';
import AGITokenNetworks from 'singularitynet-token-contracts/networks/SingularityNetToken';
import MPENetworks from 'singularitynet-platform-contracts/networks/MultiPartyEscrow';
import MPEAbi from 'singularitynet-platform-contracts/abi/MultiPartyEscrow';

export default class Account {
  constructor(web3) {
    this._web3 = web3;
    this._network = 42;
    this._tokenContract = this._generateTokenContract();
    this._mpeContract = this._generateMPEContract();
  }

  async balance() {
    return this._getTokenContract().methods.balanceOf(this._getAddress())
      .call()
      .then(balanceInCogs => (balanceInCogs / 100000000).toFixed(8));
  }

  async escrowBalance() {
    return this._getMPEContract().methods.balances(this._getAddress())
      .call()
      .then(balanceInCogs => (balanceInCogs / 100000000).toFixed(8));
  }

  _getAddress() {
    return this._web3.eth.defaultAccount;
  }

  _getTokenContract() {
    return this._tokenContract;
  }

  _getMPEContract() {
    return this._mpeContract;
  }

  _generateTokenContract() {
    return new this._web3.eth.Contract(AGITokenAbi, AGITokenNetworks[this._network].address);
  }

  _generateMPEContract() {
    return new this._web3.eth.Contract(MPEAbi, MPENetworks[this._network].address, { from: this._getAddress() });
  }
}
