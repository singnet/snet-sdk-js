// package: escrow
// file: token_service.proto

import * as token_service_pb from "./token_service_pb";
import {grpc} from "@improbable-eng/grpc-web";

type TokenServiceGetToken = {
  readonly methodName: string;
  readonly service: typeof TokenService;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof token_service_pb.TokenRequest;
  readonly responseType: typeof token_service_pb.TokenReply;
};

export class TokenService {
  static readonly serviceName: string;
  static readonly GetToken: TokenServiceGetToken;
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

export class TokenServiceClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  getToken(
    requestMessage: token_service_pb.TokenRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: token_service_pb.TokenReply|null) => void
  ): UnaryResponse;
  getToken(
    requestMessage: token_service_pb.TokenRequest,
    callback: (error: ServiceError|null, responseMessage: token_service_pb.TokenReply|null) => void
  ): UnaryResponse;
}

