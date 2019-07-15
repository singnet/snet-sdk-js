// package: escrow
// file: state_service.proto

import * as jspb from "google-protobuf";

export class ChannelStateRequest extends jspb.Message {
  getChannelId(): Uint8Array | string;
  getChannelId_asU8(): Uint8Array;
  getChannelId_asB64(): string;
  setChannelId(value: Uint8Array | string): void;

  getSignature(): Uint8Array | string;
  getSignature_asU8(): Uint8Array;
  getSignature_asB64(): string;
  setSignature(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChannelStateRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ChannelStateRequest): ChannelStateRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChannelStateRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChannelStateRequest;
  static deserializeBinaryFromReader(message: ChannelStateRequest, reader: jspb.BinaryReader): ChannelStateRequest;
}

export namespace ChannelStateRequest {
  export type AsObject = {
    channelId: Uint8Array | string,
    signature: Uint8Array | string,
  }
}

export class ChannelStateReply extends jspb.Message {
  getCurrentNonce(): Uint8Array | string;
  getCurrentNonce_asU8(): Uint8Array;
  getCurrentNonce_asB64(): string;
  setCurrentNonce(value: Uint8Array | string): void;

  getCurrentSignedAmount(): Uint8Array | string;
  getCurrentSignedAmount_asU8(): Uint8Array;
  getCurrentSignedAmount_asB64(): string;
  setCurrentSignedAmount(value: Uint8Array | string): void;

  getCurrentSignature(): Uint8Array | string;
  getCurrentSignature_asU8(): Uint8Array;
  getCurrentSignature_asB64(): string;
  setCurrentSignature(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChannelStateReply.AsObject;
  static toObject(includeInstance: boolean, msg: ChannelStateReply): ChannelStateReply.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChannelStateReply, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChannelStateReply;
  static deserializeBinaryFromReader(message: ChannelStateReply, reader: jspb.BinaryReader): ChannelStateReply;
}

export namespace ChannelStateReply {
  export type AsObject = {
    currentNonce: Uint8Array | string,
    currentSignedAmount: Uint8Array | string,
    currentSignature: Uint8Array | string,
  }
}

