import { AttOpcode } from './AttOpcode';
import { AttErrorCode } from './AttError';

export interface AttErrorRspMsg {
  requestOpcodeInError:   number;       // s:1, The request that generated this ATT_ERROR_RSP PDU
  attributeHandleInError: number;       // s:2, The attribute handle that generated this ATT_ERROR_RSP PDU
  errorCode:              AttErrorCode; // s:1, The reason why the request has generated an ATT_ERROR_RSP PDU
}

export class AttErrorRsp {
  private static readonly size = 5;

  static serialize(data: AttErrorRspMsg): Buffer {
    const buffer = Buffer.allocUnsafe(this.size);
    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ErrorRsp,          o, 1);
    o = buffer.writeUIntLE(data.requestOpcodeInError,   o, 1);
    o = buffer.writeUIntLE(data.attributeHandleInError, o, 2);
    o = buffer.writeUIntLE(data.errorCode,              o, 1);
    return buffer;
  }

  static deserialize(buffer: Buffer): AttErrorRspMsg|null {
    if (buffer.length       !== this.size ||
        buffer.readUInt8(0) !== AttOpcode.ErrorRsp) {
      return null;
    }
    return {
       requestOpcodeInError:   buffer.readUIntLE(0, 1),
       attributeHandleInError: buffer.readUIntLE(1, 2),
       errorCode:              buffer.readUIntLE(3, 1),
    };
  }
}

export interface AttExchangeMtuReqMsg {
  mtu: number;
}

export class AttExchangeMtuReq {
  private static readonly size = 3;

  static serialize(req: AttExchangeMtuReqMsg): Buffer {
    const buffer = Buffer.allocUnsafe(this.size);
    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ExchangeMtuReq, o, 1);
    o = buffer.writeUIntLE(req.mtu,                  o, 2);
    return buffer;
  }

  static deserialize(buffer: Buffer): AttExchangeMtuReqMsg|null {
    if (buffer.length       !== this.size ||
        buffer.readUInt8(0) !== AttOpcode.ExchangeMtuReq) {
      return null;
    }
    return { mtu: buffer.readUIntLE(1, 2) };
  }
}

export interface AttExchangeMtuRspMsg {
  mtu: number;
}

export class AttExchangeMtuRsp {
  private static readonly size = 3;

  static serialize(req: AttExchangeMtuRspMsg): Buffer {
    const buffer = Buffer.allocUnsafe(this.size);
    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ExchangeMtuRsp, o, 1);
    o = buffer.writeUIntLE(req.mtu,                  o, 2);
    return buffer;
  }

  static deserialize(buffer: Buffer): AttExchangeMtuRspMsg|null {
    if (buffer.length       !== this.size ||
        buffer.readUInt8(0) !== AttOpcode.ExchangeMtuRsp) {
      return null;
    }
    return { mtu: buffer.readUIntLE(1, 2) };
  }
}

export interface AttFindInformationReqMsg {
  startingHandle: number; // First requested handle number
  endingHandle:   number; // Last requested handle number
}

export class AttFindInformationReq {
  private static readonly size = 5;

  static serialize(req: AttFindInformationReqMsg): Buffer {
    const buffer = Buffer.allocUnsafe(this.size);
    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.FindInformationReq,  o, 1);
    o = buffer.writeUIntLE(req.startingHandle,            o, 2);
    o = buffer.writeUIntLE(req.endingHandle,              o, 2);
    return buffer;
  }

  static deserialize(buffer: Buffer): AttFindInformationReqMsg|null {
    if (buffer.length       !== this.size ||
        buffer.readUInt8(0) !== AttOpcode.FindInformationReq) {
      return null;
    }
    return {
      startingHandle: buffer.readUIntLE(1, 2),
      endingHandle:   buffer.readUIntLE(3, 2),
    };
  }
}

export interface AttFindInformationRspEntry {
  handle: number;
  uuid: Buffer;
}

export type AttFindInformationRspMsg = AttFindInformationRspEntry[];

export class AttFindInformationRsp {
  private static readonly minSize = 6;
  private static readonly uuidFormatToSize: Record<number, number> = { 1: 2, 2: 16 };
  private static readonly uuidSizeToFormat: Record<number, number> = { 2: 1, 16: 2 };

  static serialize(data: AttFindInformationRspMsg): Buffer {
    const uuidSize = this.getUuidSize(data);
    if (uuidSize === null) {
      throw new Error('Invalid ATT response data');
    }

    const format = this.uuidSizeToFormat[uuidSize];
    if (!format) {
      throw new Error('Invalid ATT response data');
    }

    const buffer = Buffer.allocUnsafe(2 + (2 + uuidSize) * data.length);

    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.FindInformationRsp,  o, 1);
    o = buffer.writeUIntLE(format,                        o, 1);

    for (const entry of data) {
      o  = buffer.writeUIntLE(entry.handle, o, 2);
      o += entry.uuid.copy(buffer, o);
    }

    return buffer;
  }

  private static getUuidSize(data: AttFindInformationRspMsg): number|null {
    let uuidSize: number|null = null;

    for (const entry of data) {
      const length = entry.uuid.length;

      if (uuidSize === null) {
        uuidSize = length;

        if (uuidSize !== 2 && uuidSize !== 16) {
          return null;
        }
      }

      if (uuidSize !== length) {
        return null;
      }
    }

    return uuidSize;
  }

  static deserialize(buffer: Buffer): AttFindInformationRspMsg|null {
    if (buffer.length        <  this.minSize ||
        buffer.readUInt8(0) !== AttOpcode.FindInformationRsp) {
      return null;
    }

    // check uuid size
    const format = buffer.readUInt8(1);
    const uuidSize = this.uuidFormatToSize[format];
    if (!uuidSize) {
      return null;
    }
    if (((buffer.length - 2) % uuidSize) !== 0) {
      return null;
    }

    const result: AttFindInformationRspMsg = [];

    let o = 2;
    while (o < buffer.length) {
      const handle = buffer.readUIntLE(o, 2);       o += 2;
      const uuid   = buffer.slice(o, o + uuidSize); o += uuidSize;

      result.push({ handle, uuid: uuid.reverse(), });
    }

    return result;
  }
}

export interface AttFindByTypeValueReqMsg {
  startingHandle: number; // s: 2, First requested handle number
  endingHandle:   number; // s: 2, Last requested handle number
  attributeType:  number; // s: 2, 2 octet UUID to find
  attributeValue: Buffer; // s: 0, to (ATT_MTU-7) Attribute value to find
}

export class AttFindByTypeValueReq {
  private static readonly hdrSize = 7;

  static serialize(data: AttFindByTypeValueReqMsg): Buffer {
    const buffer = Buffer.allocUnsafe(this.hdrSize + data.attributeValue.length);
    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.FindByTypeValueReq,  o, 1);
    o = buffer.writeUIntLE(data.startingHandle,           o, 2);
    o = buffer.writeUIntLE(data.endingHandle,             o, 2);
    o = buffer.writeUIntLE(data.attributeType,            o, 2);
    data.attributeValue.copy(buffer, o); // TODO should be reversed?
    return buffer;
  }

  static deserialize(buffer: Buffer): AttFindByTypeValueReqMsg|null {
    if (buffer.readUInt8(0) !== AttOpcode.FindByTypeValueReq ||
        buffer.length        <  this.hdrSize) {
      return null;
    }
    return {
      startingHandle: buffer.readUIntLE(1, 2),
      endingHandle:   buffer.readUIntLE(3, 2),
      attributeType:  buffer.readUIntLE(5, 2),
      attributeValue: buffer.slice(this.hdrSize), // TODO should be reversed?
    };
  }
}

export interface AttHandlesInformation {
  foundAttributeHandle: number;
  groupEndHandle: number;
}

export interface AttFindByTypeValueRspMsg {
  handlesInformationList: AttHandlesInformation[]; // A list of 1 or more Handle Informations
}

export class AttFindByTypeValueRsp {
  static serialize(data: AttFindByTypeValueRspMsg): Buffer {
    const buffer = Buffer.allocUnsafe(1 + data.handlesInformationList.length * 4);

    let o = buffer.writeUIntLE(AttOpcode.FindByTypeValueRsp, 0, 1);

    for (const info of data.handlesInformationList) {
      o = buffer.writeUIntLE(info.foundAttributeHandle, o, 2);
      o = buffer.writeUIntLE(info.groupEndHandle,       o, 2);
    }

    return buffer;
  }

  static deserialize(buffer: Buffer): AttFindByTypeValueRspMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.FindByTypeValueRsp) {
      return null;
    }

    const result: AttFindByTypeValueRspMsg = {
      handlesInformationList: [],
    };

    let o = 1;
    while (o < buffer.length) {
      const foundAttributeHandle = buffer.readUIntLE(o, 2); o += 2;
      const groupEndHandle       = buffer.readUIntLE(o, 2); o += 2;
      result.handlesInformationList.push({
        foundAttributeHandle, groupEndHandle,
      });
    }

    return result;
  }
}

export interface AttReadByTypeReqMsg {
  startingHandle: number; // First requested handle number
  endingHandle:   number; // Last requested handle number
  attributeType:  Buffer; // 2 or 16 octet UUID
}

export class AttReadByTypeReq {
  private static readonly hdrSize = 5;

  static serialize(data: AttReadByTypeReqMsg): Buffer {
    if ([2, 16].includes(data.attributeType.length) === false) {
      throw new Error('');
    }
    const buffer = Buffer.allocUnsafe(this.hdrSize + data.attributeType.length);
    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ReadByTypeReq, o, 1);
    o = buffer.writeUIntLE(data.startingHandle,     o, 2);
    o = buffer.writeUIntLE(data.endingHandle,       o, 2);
    data.attributeType.reverse().copy(buffer, o);
    return buffer;
  }

  static deserialize(buffer: Buffer): AttReadByTypeReqMsg|null {
    const sizes = [this.hdrSize + 2, this.hdrSize + 16];
    if (sizes.includes(buffer.length) === false ||
        buffer.readUInt8(0) !== AttOpcode.ReadByTypeReq) {
      return null;
    }
    return {
      startingHandle: buffer.readUIntLE(1, 2),
      endingHandle:   buffer.readUIntLE(3, 2),
      attributeType:  buffer.slice(this.hdrSize).reverse(),
    };
  }
}

export interface AttAttributeDataEntry {
  handle: number;
  value: Buffer;
}

export interface AttReadByTypeRspMsg {
  attributeDataList: AttAttributeDataEntry[]; // A list of Attribute Data
}

export class AttReadByTypeRsp {
  private static readonly hdrSize = 2;
  private static readonly handleSize = 2;

  static serialize(data: AttReadByTypeRspMsg): Buffer {
    const attributeDataList = data.attributeDataList;

    if (data.attributeDataList.length === 0) {
      throw new Error('Invalid ATT response data');
    }

    const attributeValueSize = attributeDataList[0].value.length;

    for (const attributeData of attributeDataList) {
      if (attributeData.value.length !== attributeValueSize) {
        throw new Error('Invalid ATT response data');
      }
    }

    const payloadSize = attributeDataList.length * (this.handleSize + attributeValueSize);
    const buffer = Buffer.allocUnsafe(this.hdrSize + payloadSize);

    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ReadByTypeRsp,               o, 1);
    o = buffer.writeUIntLE(this.handleSize + attributeValueSize,  o, 1);

    for (const attributeData of attributeDataList) {
      o  = buffer.writeUIntLE(attributeData.handle, o, 2);
      o += attributeData.value.copy(buffer, o);
    }

    return buffer;
  }

  static deserialize(buffer: Buffer): AttReadByTypeRspMsg|null {
    if (buffer.length        <  2 ||
        buffer.readUInt8(0) !== AttOpcode.ReadByTypeRsp) {
      return null;
    }

    const result: AttReadByTypeRspMsg = { attributeDataList: [] };

    let o = 1;

    const attributeValueSize = buffer.readUIntLE(o, 1) - this.handleSize;
    o += 1;

    while (o < buffer.length) {
      const handle = buffer.readUIntLE(o, this.handleSize);
      o += this.handleSize;

      const value = Buffer.allocUnsafe(attributeValueSize);
      buffer.copy(value, 0, o, attributeValueSize);
      o += attributeValueSize;

      result.attributeDataList.push({ handle, value });
    }

    return result;
  }
}

// start here

export interface AttReadReqMsg {
}

export class AttReadReq {
  static serialize(data: AttReadReqMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttReadReqMsg|null {
    return null;
  }
}

export interface AttReadRspMsg {
}

export class AttReadRsp {
  static serialize(data: AttReadRspMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttReadRspMsg|null {
    return null;
  }
}

export interface AttReadBlobReqMsg {
}

export class AttReadBlobReq {
  static serialize(data: AttReadBlobReqMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttReadBlobReqMsg|null {
    return null;
  }
}

export interface AttReadBlobRspMsg {
}

export class AttReadBlobRsp {
  static serialize(data: AttReadBlobRspMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttReadBlobRspMsg|null {
    return null;
  }
}

export interface AttReadMultipleReqMsg {
}

export class AttReadMultipleReq {
  static serialize(data: AttReadMultipleReqMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttReadMultipleReqMsg|null {
    return null;
  }
}

export interface AttReadMultipleRspMsg {
}

export class AttReadMultipleRsp {
  static serialize(data: AttReadMultipleRspMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttReadMultipleRspMsg|null {
    return null;
  }
}

export interface AttReadByGroupTypeReqMsg {
}

export class AttReadByGroupTypeReq {
  static serialize(data: AttReadByGroupTypeReqMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttReadByGroupTypeReqMsg|null {
    return null;
  }
}

export interface AttReadByGroupTypeRspMsg {
}

export class AttReadByGroupTypeRsp {
  static serialize(data: AttReadByGroupTypeRspMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttReadByGroupTypeRspMsg|null {
    return null;
  }
}

export interface AttWriteReqMsg {
}

export class AttWriteReq {
  static serialize(data: AttWriteReqMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttWriteReqMsg|null {
    return null;
  }
}

export interface AttWriteRspMsg {
}

export class AttWriteRsp {
  static serialize(data: AttWriteRspMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttWriteRspMsg|null {
    return null;
  }
}

export interface AttPrepareWriteReqMsg {
}

export class AttPrepareWriteReq {
  static serialize(data: AttPrepareWriteReqMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttPrepareWriteReqMsg|null {
    return null;
  }
}

export interface AttPrepareWriteRspMsg {
}

export class AttPrepareWriteRsp {
  static serialize(data: AttPrepareWriteRspMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttPrepareWriteRspMsg|null {
    return null;
  }
}

export interface AttExecuteWriteReqMsg {
}

export class AttExecuteWriteReq {
  static serialize(data: AttExecuteWriteReqMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttExecuteWriteReqMsg|null {
    return null;
  }
}

export interface AttExecuteWriteRspMsg {
}

export class AttExecuteWriteRsp {
  static serialize(data: AttExecuteWriteRspMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttExecuteWriteRspMsg|null {
    return null;
  }
}

export interface AttReadMultipleVariableReqMsg {
}

export class AttReadMultipleVariableReq {
  static serialize(data: AttReadMultipleVariableReqMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttReadMultipleVariableReqMsg|null {
    return null;
  }
}

export interface AttReadMultipleVariableRspMsg {
}

export class AttReadMultipleVariableRsp {
  static serialize(data: AttReadMultipleVariableRspMsg): Buffer {
    return Buffer.allocUnsafe(0);
  }

  static deserialize(buffer: Buffer): AttReadMultipleVariableRspMsg|null {
    return null;
  }
}
