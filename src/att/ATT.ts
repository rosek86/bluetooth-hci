// ref Core5.2 p1480
import { L2CAP, L2capChannelId } from "../l2cap/L2CAP";
import { AttOpcode } from "./AttOpcode";
import {
  AttErrorRsp, AttErrorRspMsg, AttMtuExchangeReq, AttMtuExchangeRsp,
  AttFindInformationReq, AttFindInformationReqMsg, AttFindInformationRsp
} from "./AttSerDes";

export enum AttErrorCode {
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

  public async errorRsp(msg: AttErrorRspMsg): Promise<void> {
    await this.writeAtt(AttErrorRsp.serialize(msg));
  }

  public async mtuExchangeReq(clientRxMtu: number): Promise<void> {
    await this.writeAtt(AttMtuExchangeReq.serialize(clientRxMtu));
  }

  public async mtuExchangeRsp(serverRxMtu: number): Promise<void> {
    await this.writeAtt(AttMtuExchangeRsp.serialize(serverRxMtu));
  }

  public async findInformationReq(info: AttFindInformationReqMsg): Promise<void> {
    await this.writeAtt(AttFindInformationReq.serialize(info));
  }

  private async writeAtt(data: Buffer): Promise<void> {
    await this.l2cap.writeAclData(
      this.connectionHandle,
      L2capChannelId.LeAttributeProtocol,
      data
    );
  }

  private onAttData = (connectionHandle: number, data: Buffer): void => {
    console.log(connectionHandle, data);
    const opcode: AttOpcode = data[0];

    switch (opcode) {
      case AttOpcode.ErrorRsp: {
        const errorRspMsg = AttErrorRsp.deserialize(data);
        console.log(`errorRsp: ${errorRspMsg}`);
        break;
      }
      case AttOpcode.ExchangeMtuReq: {
        const serverRxMtu = AttMtuExchangeReq.deserialize(data);
        console.log(`serverRxMtu: ${serverRxMtu}`);
        break;
      }
      case AttOpcode.ExchangeMtuRsp: {
        const clientRxMtu = AttMtuExchangeRsp.deserialize(data);
        console.log(`clientRxMtu: ${clientRxMtu}`);
        break;
      }
      case AttOpcode.FindInformationReq: {
        const info = AttFindInformationReq.deserialize(data);
        console.log(`find info: ${info}`);
        break;
      }
      case AttOpcode.FindInformationRsp: {
        const info = AttFindInformationRsp.deserialize(data);
        if (!info) { return; }
        for (const e of info) {
          console.log(e.handle, e.uuid.toString('hex'));
        }
        break;
      }
    }
  }
}
