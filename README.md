# snet-sdk-js
SingularityNET SDK for JavaScript
  
## Getting Started
This repo hosts multiple SDKs for JavaScript. Currently supported platforms
1. Node.js using [grpc-node](https://github.com/grpc/grpc-node)
2. Browser (Web) using [grpc-web](https://github.com/improbable-eng/grpc-web)

You can find more details about each sdk within the respective package folders.
1. Node.js under `packages/nodejs` directory
2. Web under `packages/web` directory

**These SDKs are under active development and not ready for production use yet. If you find any bug or something doesn't work as expected, please create an issue.**

## Usage
All the SDKs assume that there is enough `eth` balance to cover the `gas` cost and `AGI` tokens in the wallet to cover the service execution cost.

The SDKs chose a default `PaymentManagementStrategy` which is the simplest form of picking an existing `Payment Channel` if any or creates a new `Payment Channel` if no channel is found. This can be easily overridden by providing your own strategy to the SDK at the time of construction. Documentation on creating custom strategies will be available soon.

## Development
This is a monorepo which is setup a little differently. It does not use any external tools like [lerna](https://github.com/lerna/lerna) or any other popular tool.

There are 3 packages out of which only 2 of them are published to npm
1. core
2. nodejs (published)
3. web (published)

The way the `core` package is shared across `nodejs` and `web` is by creating a symlink to core under each package. This setup has been tested on `macOS` and should work on any standard `Linux` distribution but it has not been tested on `Windows` OS. 

### Build
Navigate to the specific package which needs to be build and then run the following command
```shell
npm run build
```

### Publish
Navigate to the specific package which needs to be published and then run the following command
```bash
npm run publish
```


[LICENSE](https://github.com/singnet/snet-sdk-js/blob/master/LICENSE) file for details.
