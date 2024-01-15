import grpc from '@grpc/grpc-js';
import { ChannelStateReply, ChannelStateRequest, FreeCallStateReply, FreeCallStateRequest } from '../../src/proto/state_service_pb.js';

function serialize_escrow_ChannelStateReply(arg) {
  if (!(arg instanceof ChannelStateReply)) {
    throw new Error('Expected argument of type escrow.ChannelStateReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_escrow_ChannelStateReply(buffer_arg) {
  return ChannelStateReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_escrow_ChannelStateRequest(arg) {
  if (!(arg instanceof ChannelStateRequest)) {
    throw new Error('Expected argument of type escrow.ChannelStateRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_escrow_ChannelStateRequest(buffer_arg) {
  return ChannelStateRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_escrow_FreeCallStateReply(arg) {
  if (!(arg instanceof FreeCallStateReply)) {
    throw new Error('Expected argument of type escrow.FreeCallStateReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_escrow_FreeCallStateReply(buffer_arg) {
  return FreeCallStateReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_escrow_FreeCallStateRequest(arg) {
  if (!(arg instanceof FreeCallStateRequest)) {
    throw new Error('Expected argument of type escrow.FreeCallStateRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_escrow_FreeCallStateRequest(buffer_arg) {
  return FreeCallStateRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

// PaymentChannelStateService contains methods to get the MultiPartyEscrow
// payment channel state.
export const PaymentChannelStateServiceService = {
  // GetChannelState method returns a channel state by channel id.
  getChannelState: {
    path: '/escrow.PaymentChannelStateService/GetChannelState',
    requestStream: false,
    responseStream: false,
    requestType: ChannelStateRequest,
    responseType: ChannelStateReply,
    requestSerialize: serialize_escrow_ChannelStateRequest,
    requestDeserialize: deserialize_escrow_ChannelStateRequest,
    responseSerialize: serialize_escrow_ChannelStateReply,
    responseDeserialize: deserialize_escrow_ChannelStateReply,
  },
};

export const PaymentChannelStateServiceClient = grpc.makeGenericClientConstructor(PaymentChannelStateServiceService);

// Used to determine free calls available for a given user.
export const FreeCallStateServiceService = {
  getFreeCallsAvailable: {
    path: '/escrow.FreeCallStateService/GetFreeCallsAvailable',
    requestStream: false,
    responseStream: false,
    requestType: FreeCallStateRequest,
    responseType: FreeCallStateReply,
    requestSerialize: serialize_escrow_FreeCallStateRequest,
    requestDeserialize: deserialize_escrow_FreeCallStateRequest,
    responseSerialize: serialize_escrow_FreeCallStateReply,
    responseDeserialize: deserialize_escrow_FreeCallStateReply,
  },
};

export const FreeCallStateServiceClient = grpc.makeGenericClientConstructor(FreeCallStateServiceService);
