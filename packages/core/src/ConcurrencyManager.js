class ConcurrencyManager {
    constructor(concurrentCalls = 1) {
        this._concurrentCalls = concurrentCalls
        this._token = ''
        this._plannedAmount = 0
        this._usedAmount = 0
    }

    get concurrentCalls() {
        return this._concurrentCalls
    }

    getToken(serviceClient, channel, serviceCallPrice) {
        let amount = channel.state.last_signed_amount
        if(!token || amount === 0) {
            return this.getNewToken(serviceClient, channel, amount)
        }
        amount += serviceCallPrice
        const tokenResponse = this.getTokenForAmount(serviceClient, channel, amount)
        const {plannedAmount, usedAmount, token} = tokenResponse
        this.plannedAmount = plannedAmount
        this.usedAmount = usedAmount
        return token
    }

    _getNewToken(serviceClient, channel, amount) {
        const tokenResponse = this.getTokenForAmount(serviceClient, channel, amount)
        const {plannedAmount, usedAmount, token} = tokenResponse
        if (usedAmount < plannedAmount) {
            self.usedAmount = usedAmount
            self.plannedAmount = plannedAmount
            return token
        }
    }

    _getTokenForAmount(serviceClient, channel, amount) {
        // TODO: Change is at per javascript gRPC
        const nonce = channel.state.nonce
        const stub = this.getStubForGetToken()
        const currentBlockNumber = serviceClient.sdkWeb3.eth.getBlock("latest").number
        const message = web3.soliditySha3(
            ["string", "address", "uint256", "uint256", "uint256"],
            ["__MPE_claim_message", serviceClient.mpeAddress, channel.channelId, nonce, amount]
        )
        const mpeSignature = serviceClient.generateSignature(message)
        const tokenMessage = web3.soliditySha3(
            ["bytes", "uint256"],
            [mpe_signature, current_block_number]
        )
        const tokenSignature = serviceClient.generateSignature(tokenMessage)
        const request = tokenServicePb.TokenRequest(channel.channelId,nonce,amount,Bytes(tokenSignature),Bytes(mpeSignature),currentBlockNumber)
        const tokenResponse = stub.GetToken(request)
        return tokenResponse
    }

    _getStubForGetToken() {
        // return appropriate gRPC method for GetToken
    }
}