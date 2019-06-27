// package: escrow
// file: state_service.proto

import * as state_service_pb from "./state_service_pb";
import {grpc} from "@improbable-eng/grpc-web";

type PaymentChannelStateServiceGetChannelState = {
  readonly methodName: string;
  readonly service: typeof PaymentChannelStateService;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof state_service_pb.ChannelStateRequest;
  readonly responseType: typeof state_service_pb.ChannelStateReply;
};

export class PaymentChannelStateService {
  static readonly serviceName: string;
  static readonly GetChannelState: PaymentChannelStateServiceGetChannelState;
}

export type ServiceError = { message: string, code: number; metadata: grpc.Metadata }
export type Status = { details: string, code: number; metadata: grpc.Metadata }

interface UnaryResponse {
  cancel(): void;
}
interface ResponseStream<T> {
  cancel(): void;
  on(type: 'data', handler: (message: T) => void): ResponseStream<T>;
  on(type: 'end', handler: (status?: Status) => void): ResponseStream<T>;
  on(type: 'status', handler: (status: Status) => void): ResponseStream<T>;
}
interface RequestStream<T> {
  write(message: T): RequestStream<T>;
  end(): void;
  cancel(): void;
  on(type: 'end', handler: (status?: Status) => void): RequestStream<T>;
  on(type: 'status', handler: (status: Status) => void): RequestStream<T>;
}
interface BidirectionalStream<ReqT, ResT> {
  write(message: ReqT): BidirectionalStream<ReqT, ResT>;
  end(): void;
  cancel(): void;
  on(type: 'data', handler: (message: ResT) => void): BidirectionalStream<ReqT, ResT>;
  on(type: 'end', handler: (status?: Status) => void): BidirectionalStream<ReqT, ResT>;
  on(type: 'status', handler: (status: Status) => void): BidirectionalStream<ReqT, ResT>;
}

export class PaymentChannelStateServiceClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  getChannelState(
    requestMessage: state_service_pb.ChannelStateRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: state_service_pb.ChannelStateReply|null) => void
  ): UnaryResponse;
  getChannelState(
    requestMessage: state_service_pb.ChannelStateRequest,
    callback: (error: ServiceError|null, responseMessage: state_service_pb.ChannelStateReply|null) => void
  ): UnaryResponse;
}

