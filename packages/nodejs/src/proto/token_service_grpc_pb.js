import grpc from '@grpc/grpc-js';
import { TokenReply, TokenRequest } from '../../src/proto/token_service_pb.js';

function serialize_escrow_TokenReply(arg) {
  if (!(arg instanceof TokenReply)) {
    throw new Error('Expected argument of type escrow.TokenReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_escrow_TokenReply(buffer_arg) {
  return TokenReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_escrow_TokenRequest(arg) {
  if (!(arg instanceof TokenRequest)) {
    throw new Error('Expected argument of type escrow.TokenRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_escrow_TokenRequest(buffer_arg) {
  return TokenRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

// TokenServiceService contains methods related to token services
export const TokenServiceService = {
  // GetToken method checks the Signature sent and returns a Token
  getToken: {
    path: '/escrow.TokenService/GetToken',
    requestStream: false,
    responseStream: false,
    requestType: TokenRequest,
    responseType: TokenReply,
    requestSerialize: serialize_escrow_TokenRequest,
    requestDeserialize: deserialize_escrow_TokenRequest,
    responseSerialize: serialize_escrow_TokenReply,
    responseDeserialize: deserialize_escrow_TokenReply,
  },
};

export const TokenServiceClient = grpc.makeGenericClientConstructor(TokenServiceService);
