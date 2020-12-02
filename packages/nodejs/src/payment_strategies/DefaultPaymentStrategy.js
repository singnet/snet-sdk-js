import FreeCallPaymentStrategy from './FreeCallPaymentStrategy';
import PrepaidPaymentStrategy from './PrepaidPaymentStrategy';
import ConcurrencyManager from '../ConcurrencyManager';
import PaidCallPaymentStrategy from './PaidCallPaymentStrategy';

class DefaultPaymentStrategy {
  /**
   * Initializing the payment strategy
   * @param {number} concurrentCalls
   */
  constructor(concurrentCalls = 1) {
    this._concurrentCalls = concurrentCalls;
  }

  /**
   * map the metadata for the gRPC call
   * @param {BaseServiceClient} serviceClient
   * @returns {Promise<({'snet-payment-type': string}|{'snet-payment-channel-id': string}|{'snet-payment-channel-nonce': string}|{'snet-payment-channel-amount': string}|{'snet-payment-channel-signature-bin': Buffer})[]>}
   */
  async getPaymentMetadata(serviceClient) {
    const freeCallPaymentStrategy = new FreeCallPaymentStrategy(serviceClient);
    const isFreeCallsAvailable = await freeCallPaymentStrategy.isFreeCallAvailable();
    let metadata;
    if(isFreeCallsAvailable) {
      metadata = await freeCallPaymentStrategy.getPaymentMetadata();
    } else if(serviceClient.concurrencyFlag) {
      const concurrencyManager = new ConcurrencyManager(this._concurrentCalls, serviceClient);
      const paymentStrategy = new PrepaidPaymentStrategy(serviceClient, concurrencyManager);
      metadata = await paymentStrategy.getPaymentMetadata();
    } else {
      const paymentStrategy = new PaidCallPaymentStrategy(serviceClient);
      metadata = await paymentStrategy.getPaymentMetadata();
    }

    return metadata;
  }
}

export default DefaultPaymentStrategy;
