# snet-sdk
![npm](https://img.shields.io/npm/v/snet-sdk.svg)

SingularityNET SDK for Node.js
  
## Getting Started  
  
These instructions are for the development and use of the SingularityNET SDK for JavaScript on Node.js platform.

### Node.js and npm Requirements

This package requires **Node.js version 18** or higher and **npm version 8** or higher. Please ensure these versions are installed on your system before using this package.

### Installation
```bash
npm install snet-sdk
```
### Usage

The SingularityNET SDK allows you to import compiled client libraries for your service or services of choice and make calls to those services programmatically from your application by setting up state channels with the providers of those services and making gRPC calls to the SingularityNET daemons for those services by selecting a channel with sufficient funding and supplying the appropriate metadata for authentication.
  
```javascript
import SnetSDK from 'snet-sdk';
import config from './config';
const sdk = new SnetSDK(config);
```

You can find a sample config below

```json
{
  "web3Provider": "",
  "privateKey": "",
  "networkId": "",
  "ipfsEndpoint": "https://ipfs.singularitynet.io",
  "defaultGasPrice": "4700000",
  "defaultGasLimit": "210000"
}
```

| **Key**            | **Description**                                                                           |
|--------------------|-------------------------------------------------------------------------------------------|
| `web3Provider`     | The URL of the Web3 provider, used to interact with the Ethereum network.|
| `privateKey`       | The private key of the Ethereum account used for signing transactions. Must start with 0x |
| `networkId`        | The ID of the Ethereum network to connect to. (1 for Mainnet or 11155111 for Sepolia)|
| `ipfsEndpoint`     | The endpoint for connecting to an SingularityNet IPFS node|
| `defaultGasPrice`  | The gas price (in wei) to be used for transactions.|
| `defaultGasLimit`  | The gas limit to be set for transactions.|


Now, the instance of the sdk can be used to instantiate clients for SingularityNET services. To interact with those services, the sdk needs to be supplied with the compiled gRPC client libraries.
  
To generate the gRPC client libraries, you need the SingularityNET Command Line Interface, or CLI, which you can download from PyPi, see [https://github.com/singnet/snet-cli#installing-with-pip](https://github.com/singnet/snet-cli#installing-with-pip)
  
Once you have the CLI installed, run the following command:
```bash
$ snet sdk generate-client-library nodejs <org_id> <service_id>
```
Optionally, you can specify an output path; otherwise it's going to be `./client_libraries/nodejs/<hash>/<org_id>/<service_id>`

Once you have the generated gRPC client libraries, you can create an instance of a SingularityNET service client:
```javascript
const SnetSDK = require('snet-sdk');
// Load the configuration file
const config = require('<path_to_config_file>');
// Import the generated gRPC client library for the specific service
const grpc = require('<path_to_generated_grpc_js_file>');

const sdk = new SnetSDK.default(config);
const client = await sdk.createServiceClient("<org_id>", "<service_id>", grpc.<ClientStub>)
```
This generates a service client which can be used to make gRPC calls to the desired service.
You can then invoke service specific calls as follows
```javascript
const methodDescriptor = grpc.<ServiceStub>.<methodName>;
const request = new methodDescriptor.requestType();
request.<serviceSetMethod>("<message>");
client.service.<methodName>(<gRPC.message>, (err, result) => {
    // Callback receives two parameters: err and result
});
```

#### Full Example of a Function Call
Here’s a complete example demonstrating how to call a service method:
```javascript
const SnetSDK = require('snet-sdk');
const config = require('<path_to_config_file>');
const grpc = require('<path_to_generated_grpc_js_file>');

function parseResponse(err, result) {
    if (err) {
        console.log("GRPC call failed");
        console.error(err);
    } else {
        console.log("Result:", result.toString());
        console.log("<---------->");
    }
}

async function test() {
    const sdk = new SnetSDK.default(config);
    const client = await sdk.createServiceClient("<org_id>", "<service_id>", grpc.<ClientStub>)
    const methodDescriptor = grpc.<ServiceStub>.<serviceMethod>;
    const request = new methodDescriptor.requestType();
    request.<serviceSetMethod>("<message>");
    await client.service.<serviceMethod>(request, parseResponse);
}
```
---

### Concurrency
SDK exposes two methods to facilitate concurrent service calls. 
 - getConcurrencyTokenAndChannelId
 - setConcurrencyTokenAndChannelId
 
 In the consumer, you should call the getConcurrencyTokenAndChannelId() in the master thread.  
 It will return the concurrency token and the channel id. 
 Pass both of them to worker threads and the set the same in the respective instances using setConcurrencyTokenAndChannelId.  
 
 SDK also exposes the `class DefaultPaymentStrategy` to handle the payment metadata for concurrent calls. 
 Initialize the DefaultPaymentStrategy with the number of calls you would want to run concurrently.
 
 e.g
 ```
import SnetSDK, { DefaultPaymentStrategy } from "snet-sdk";
const sdk = new SnetSDK(config);
import cluster from "cluster";

const main = async () => {
...
// Planning for four concurrent calls
const paymentStrategy = new DefaultPaymentStrategy(4);
const serviceClient = await sdk.createServiceClient(
        orgId,
        serviceId,
        service.CalculatorClient,
        groupName,
        paymentStrategy,
        serviceClientOptionsFreeCall
      );

if(cluster.isMaster) {
 const {concurrencyToken, channelId} = await serviceClient.getConcurrencyTokenAndChannelId()
 const worker = cluster.fork()
 worker.on("message", message=>{
     console.log(`worker:${worker.id}, message:${message}`)
     worker.send({concurrencyToken,channelId, info:"master: sent you the concurrency token and channel id"})
 })
}else {
 process.send(`send me the token for concurrency`);
 process.on("message", async (message) => {
         const { concurrencyToken, info,channelId } = message;
         console.log(info);
         serviceClient.setConcurrencyTokenAndChannelId(concurrencyToken,channelId)
         const numbers = new messages.Numbers();
         numbers.setA(6);
         numbers.setB(7);
         serviceClient.service.mul(numbers, (err, result)=>{
          if(err) {
            console.error(`service failed with error ${err}`)
          }else{
            console.log(`service response is ${result}`)
            }
         });
 });
}
main()
```
 
 
### Versioning  
  
We use [SemVer](http://semver.org/) for versioning. For the versions available, see the
[tags on this repository](https://github.com/singnet/snet-sdk-js/tags).   
  
## License  
  
This project is licensed under the MIT License - see the
[LICENSE](https://github.com/singnet/snet-sdk-js/blob/master/LICENSE) file for details.
