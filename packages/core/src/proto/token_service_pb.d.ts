// package: escrow
// file: token_service.proto

import * as jspb from "google-protobuf";

export class TokenRequest extends jspb.Message {
  getChannelId(): number;
  setChannelId(value: number): void;

  getCurrentNonce(): number;
  setCurrentNonce(value: number): void;

  getSignedAmount(): number;
  setSignedAmount(value: number): void;

  getSignature(): Uint8Array | string;
  getSignature_asU8(): Uint8Array;
  getSignature_asB64(): string;
  setSignature(value: Uint8Array | string): void;

  getCurrentBlock(): number;
  setCurrentBlock(value: number): void;

  getClaimSignature(): Uint8Array | string;
  getClaimSignature_asU8(): Uint8Array;
  getClaimSignature_asB64(): string;
  setClaimSignature(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TokenRequest.AsObject;
  static toObject(includeInstance: boolean, msg: TokenRequest): TokenRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TokenRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TokenRequest;
  static deserializeBinaryFromReader(message: TokenRequest, reader: jspb.BinaryReader): TokenRequest;
}

export namespace TokenRequest {
  export type AsObject = {
    channelId: number,
    currentNonce: number,
    signedAmount: number,
    signature: Uint8Array | string,
    currentBlock: number,
    claimSignature: Uint8Array | string,
  }
}

export class TokenReply extends jspb.Message {
  getChannelId(): number;
  setChannelId(value: number): void;

  getToken(): string;
  setToken(value: string): void;

  getPlannedAmount(): number;
  setPlannedAmount(value: number): void;

  getUsedAmount(): number;
  setUsedAmount(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TokenReply.AsObject;
  static toObject(includeInstance: boolean, msg: TokenReply): TokenReply.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TokenReply, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TokenReply;
  static deserializeBinaryFromReader(message: TokenReply, reader: jspb.BinaryReader): TokenReply;
}

export namespace TokenReply {
  export type AsObject = {
    channelId: number,
    token: string,
    plannedAmount: number,
    usedAmount: number,
  }
}

