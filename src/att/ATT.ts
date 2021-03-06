// ref Core5.2 p1480
import { L2CAP, L2capChannelId } from "../l2cap/L2CAP";

enum AttOpcode {
  ErrorRsp                = 0x01, // Request Opcode in Error, Attribute Handle In Error, Error Code
  ExchangeMtuReq          = 0x02, // Client Rx MTU
  ExchangeMtuRsp          = 0x03, // Server Rx MTU
  FindInformationReq      = 0x04, // Starting Handle, Ending Handle
  FindInformationRsp      = 0x05, // Format, Information Data
  FindByTypeValueReq      = 0x06, // Starting Handle, Ending Handle, Attribute Type, Attribute Value
  FindByTypeValueRsp      = 0x07, // Handles Information List
  ReadByTypeReq           = 0x08, // Starting Handle, Ending Handle, UUID
  ReadByTypeRsp           = 0x09, // Length, Attribute Data List
  ReadReq                 = 0x0A, // Attribute Handle
  ReadRsp                 = 0x0B, // Attribute Value
  ReadBlobReq             = 0x0C, // Attribute Handle, Value Offset
  ReadBlopRsp             = 0x0D, // Part Attribute Value
  ReadMultipleReq         = 0x0E, // Handle Set
  ReadMultipleRsp         = 0x0F, // Value Set
  ReadByGroupTypeReq      = 0x10, // Start Handle, Ending Handle, UUID
  ReadByGroupTypeRsp      = 0x11, // Length, Attribute Data List
  WriteReq                = 0x12, // Attribute Handle, Attribute Value
  WriteRsp                = 0x13, // -
  WriteCmd                = 0x52, // Attribute Handle, Attribute Value
  PrepareWriteReq         = 0x16, // Attribute Handle, Value Offset, Part Attribute Value
  PrepareWriteRsp         = 0x17, // Attribute Handle, Value Offset, Part Attribute Value
  ExecuteWriteReq         = 0x18, // Flags
  ExecuteWriteRsp         = 0x19, // -
  ReadMultipleVariableReq = 0x20, // Set Of Handles
  ReadMultipleVariableRsp = 0x21, // Length Value Tuple List
  MultipleHandleValueNtf  = 0x23, // Handle Length Value Tuple List
  HandleValueNtf          = 0x1B, // Attribute Handle, Attribute Value
  HandleValueInd          = 0x1D, // Attribute Handle, Attribute Value
  HandleValueCfm          = 0x1E, // -
  SignedWriteCmd          = 0xD2, // Attribute Handle, Attribute Value, Authentication Signature
}

enum AttErrorCode {
  InvalidHandle                 = 0x01, // The attribute handle given was not valid on this server.
  ReadNotPermitted              = 0x02, // The attribute cannot be read.
  WriteNotPermitted             = 0x03, // The attribute cannot be written.
  InvalidPDU                    = 0x04, // The attribute PDU was invalid.
  InsufficientAuthentication    = 0x05, // The attribute requires authentication before it can be read or written.
  RequestNotSupported           = 0x06, // Attribute server does not support the request received from the client.
  InvalidOffset                 = 0x07, // Offset specified was past the end of the attribute.
  InsufficientAuthorization     = 0x08, // The attribute requires authorization before it can be read or written.
  PrepareQueueFull              = 0x09, // Too many prepare writes have been queued.
  AttributeNotFound             = 0x0A, // No attribute found within the given attribute handle range.
  AttributeNotLong              = 0x0B, // The attribute cannot be read using the ATT_READ_BLOB_REQ PDU.
  InsufficientEncryptionKeySize = 0x0C, // The Encryption Key Size used for encrypting this link is insufficient.
  InvalidAttributeValueLength   = 0x0D, // The attribute value length is invalid for the operation.
  UnlikelyError                 = 0x0E, // The attribute request that was requested has encountered an error that
                                        // was unlikely, and therefore could not be completed as requested.
  InsufficientEncryption        = 0x0F, // The attribute requires encryption before it can be read or written.
  UnsupportedGroupType          = 0x10, // The attribute type is not a supported grouping attribute as defined
                                        // by a higher layer specification.
  InsufficientResources         = 0x11, // Insufficient Resources to complete the request.
  DatabaseOutOfSync             = 0x12, // The server requests the client to rediscover the database.
  ValueNotAllowed               = 0x13, // The attribute parameter value was not allowed.

  // ApplicationError
  //   0x80 – 0x9F
  //   Application error code defined by a higher layer specification.
  // CommonProfileAndServiceErrorCodes
  //   0xE0 – 0xFF
  //   Common profile and service error codes defined in Core Specification Supplement, Part B.
}

export class ATT {

  constructor (private l2cap: L2CAP, private connectionHandle: number) {
    l2cap.on('AttData', this.onAttData);
  }

  public destroy(): void {
    this.l2cap.removeListener('AttData', this.onAttData);
  }

  public async mtuExchangeRequest(mtu: number): Promise<void> {
    const buf = Buffer.allocUnsafe(3);

    buf.writeUInt8(AttOpcode.ExchangeMtuReq,  0);
    buf.writeUInt16LE(mtu,                    1);

    await this.l2cap.writeAclData(this.connectionHandle, L2capChannelId.LeAttributeProtocol, buf);
  }

  private onAttData = (connectionHandle: number, data: Buffer): void => {
    console.log(connectionHandle, data);
    const opcode: AttOpcode = data[0];
    const payload = data.slice(1);

    if (opcode === AttOpcode.ExchangeMtuRsp) {
      const clientRxMtu = payload.readUIntLE(0, 2);
      console.log(`clientRxMtu: ${clientRxMtu}`);
    }
  }
}
