import { AttOpcode } from './AttOpcode.js';
import { AttErrorCode } from './AttError.js';

import Debug from 'debug';

const debug = Debug('bt-hci-att-serdes');

export interface AttSerDes<T> {
  serialize(data: T): Buffer;
  deserialize(buffer: Buffer): T|null;
}

export interface AttErrorRspMsg {
  requestOpcodeInError:   number;       // s:1, The request that generated this ATT_ERROR_RSP PDU
  attributeHandleInError: number;       // s:2, The attribute handle that generated this ATT_ERROR_RSP PDU
  errorCode:              AttErrorCode; // s:1, The reason why the request has generated an ATT_ERROR_RSP PDU
}

export class AttErrorRsp {
  private static readonly size = 5;

  static serialize(data: AttErrorRspMsg): Buffer {
    const buffer = Buffer.alloc(this.size);
    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ErrorRsp,          o, 1);
    o = buffer.writeUIntLE(data.requestOpcodeInError,   o, 1);
    o = buffer.writeUIntLE(data.attributeHandleInError, o, 2);
        buffer.writeUIntLE(data.errorCode,              o, 1);
    return buffer;
  }

  static deserialize(buffer: Buffer): AttErrorRspMsg|null {
    if (buffer.length       !== this.size ||
        buffer.readUInt8(0) !== AttOpcode.ErrorRsp) {
      return null;
    }
    return {
       requestOpcodeInError:   buffer.readUIntLE(1, 1),
       attributeHandleInError: buffer.readUIntLE(2, 2),
       errorCode:              buffer.readUIntLE(4, 1),
    };
  }
}

export interface AttExchangeMtuReqMsg {
  mtu: number;
}

export class AttExchangeMtuReq {
  private static readonly size = 3;

  static serialize(req: AttExchangeMtuReqMsg): Buffer {
    const buffer = Buffer.alloc(this.size);
    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ExchangeMtuReq, o, 1);
        buffer.writeUIntLE(req.mtu,                  o, 2);
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
    const buffer = Buffer.alloc(this.size);
    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ExchangeMtuRsp, o, 1);
        buffer.writeUIntLE(req.mtu,                  o, 2);
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
    const buffer = Buffer.alloc(this.size);
    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.FindInformationReq,  o, 1);
    o = buffer.writeUIntLE(req.startingHandle,            o, 2);
        buffer.writeUIntLE(req.endingHandle,              o, 2);
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

    const buffer = Buffer.alloc(2 + (2 + uuidSize) * data.length);

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
    if (((buffer.length - 2) % (uuidSize + 2)) !== 0) {
      return null;
    }

    const result: AttFindInformationRspMsg = [];

    let o = 2;
    while (o < buffer.length) {
      const handle = buffer.readUIntLE(o, 2);       o += 2;
      const uuid   = buffer.subarray(o, o + uuidSize); o += uuidSize;

      result.push({ handle, uuid, });
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
    const buffer = Buffer.alloc(this.hdrSize + data.attributeValue.length);
    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.FindByTypeValueReq,  o, 1);
    o = buffer.writeUIntLE(data.startingHandle,           o, 2);
    o = buffer.writeUIntLE(data.endingHandle,             o, 2);
    o = buffer.writeUIntLE(data.attributeType,            o, 2);
    data.attributeValue.copy(buffer, o);
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
      attributeValue: buffer.subarray(this.hdrSize),
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
    const buffer = Buffer.alloc(1 + data.handlesInformationList.length * 4);

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
      throw new Error('Invalid attribute type length');
    }
    const buffer = Buffer.alloc(this.hdrSize + data.attributeType.length);
    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ReadByTypeReq, o, 1);
    o = buffer.writeUIntLE(data.startingHandle,     o, 2);
    o = buffer.writeUIntLE(data.endingHandle,       o, 2);
    data.attributeType.copy(buffer, o);
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
      attributeType:  buffer.subarray(this.hdrSize),
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
    const buffer = Buffer.alloc(this.hdrSize + payloadSize);

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

      const value = Buffer.alloc(attributeValueSize);
      buffer.copy(value, 0, o, attributeValueSize);
      o += attributeValueSize;

      result.attributeDataList.push({ handle, value });
    }

    return result;
  }
}

export interface AttReadReqMsg {
  attributeHandle: number;
}

export class AttReadReq {
  static serialize(data: AttReadReqMsg): Buffer {
    const buffer = Buffer.alloc(3);

    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ReadReq,     o, 1);
        buffer.writeUIntLE(data.attributeHandle,  o, 2);

    return buffer;
  }

  static deserialize(buffer: Buffer): AttReadReqMsg|null {
    if (buffer.length        <  3 ||
        buffer.readUInt8(0) !== AttOpcode.ReadReq) {
      return null;
    }

    return { attributeHandle: buffer.readUIntLE(1, 2) };
  }
}

export interface AttReadRspMsg {
  attributeValue: Buffer;
}

export class AttReadRsp {
  static serialize(data: AttReadRspMsg): Buffer {
    const buffer = Buffer.alloc(1 + data.attributeValue.length);
    buffer.writeUInt8(AttOpcode.ReadRsp, 0);
    data.attributeValue.copy(buffer, 1);
    return buffer;
  }

  static deserialize(buffer: Buffer): AttReadRspMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.ReadRsp) {
      return null;
    }

    return { attributeValue: buffer.subarray(1) };
  }
}

export interface AttReadBlobReqMsg {
  attributeHandle: number;
  valueOffset: number;
}

export class AttReadBlobReq {
  static serialize(data: AttReadBlobReqMsg): Buffer {
    const buffer = Buffer.alloc(5);

    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ReadBlobReq, o, 1);
    o = buffer.writeUIntLE(data.attributeHandle,  o, 2);
        buffer.writeUIntLE(data.valueOffset,      o, 2);

    return buffer;
  }

  static deserialize(buffer: Buffer): AttReadBlobReqMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.ReadBlobReq) {
      return null;
    }

    return {
      attributeHandle:  buffer.readUIntLE(1, 2),
      valueOffset:      buffer.readUIntLE(3, 2),
    };
  }
}

export interface AttReadBlobRspMsg {
  partAttributeValue: Buffer;
}

export class AttReadBlobRsp {
  static serialize(data: AttReadBlobRspMsg): Buffer {
    const buffer = Buffer.alloc(1 + data.partAttributeValue.length);
    buffer.writeUIntLE(AttOpcode.ReadBlobRsp, 0, 1);
    data.partAttributeValue.copy(buffer, 1);
    return buffer;
  }

  static deserialize(buffer: Buffer): AttReadBlobRspMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.ReadBlobRsp) {
      return null;
    }

    return { partAttributeValue: buffer.subarray(1) };
  }
}

export interface AttReadMultipleReqMsg {
  setOfHandles: number[];
}

export class AttReadMultipleReq {
  static serialize(data: AttReadMultipleReqMsg): Buffer {
    const buffer = Buffer.alloc(1 + 2 * data.setOfHandles.length);

    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ReadMultipleReq, o, 1);
    for (const handle of data.setOfHandles) {
      o = buffer.writeUIntLE(handle, o, 2);
    }

    return buffer;
  }

  static deserialize(buffer: Buffer): AttReadMultipleReqMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.ReadMultipleReq) {
      return null;
    }

    const data: AttReadMultipleReqMsg = { setOfHandles: [] };

    let o = 1;
    while (o < buffer.length) {
      data.setOfHandles.push(buffer.readUIntLE(o, 2));
      o += 2;
    }

    return data;
  }
}

export interface AttReadMultipleRspMsg {
  setOfValues: Buffer;
}

export class AttReadMultipleRsp {
  static serialize(data: AttReadMultipleRspMsg): Buffer {
    const buffer = Buffer.alloc(1 + data.setOfValues.length);
    buffer.writeUInt8(AttOpcode.ReadMultipleRsp, 0);
    data.setOfValues.copy(buffer, 1);
    return buffer;
  }

  static deserialize(buffer: Buffer): AttReadMultipleRspMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.ReadMultipleRsp) {
      return null;
    }

    return { setOfValues: buffer.subarray(1) };
  }
}

export interface AttReadByGroupTypeReqMsg {
  startingHandle: number;
  endingHandle: number;
  attributeGroupType: Buffer;
}

export class AttReadByGroupTypeReq {
  private static readonly hdrSize = 5;

  static serialize(data: AttReadByGroupTypeReqMsg): Buffer {
    if ([2, 16].includes(data.attributeGroupType.length) === false) {
      throw new Error('Invalid ATT data');
    }

    const buffer = Buffer.alloc(this.hdrSize + data.attributeGroupType.length);

    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ReadByGroupTypeReq, o, 1);
    o = buffer.writeUIntLE(data.startingHandle,          o, 2);
    o = buffer.writeUIntLE(data.endingHandle,            o, 2);
    data.attributeGroupType.copy(buffer, o);

    return buffer;
  }

  static deserialize(buffer: Buffer): AttReadByGroupTypeReqMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.ReadByGroupTypeReq) {
      return null;
    }
    const availableSize = [this.hdrSize + 2, this.hdrSize + 16];
    if (availableSize.includes(buffer.length) === false) {
      return null;
    }

    return {
      startingHandle:     buffer.readUIntLE(1, 2),
      endingHandle:       buffer.readUIntLE(3, 2),
      attributeGroupType: buffer.subarray(this.hdrSize),
    };
  }
}

export interface AttReadByGroupTypeRspMsg {
  attributeDataList: {
    attributeHandle: number;
    endGroupHandle: number;
    attributeValue: Buffer;
  }[];
}

export class AttReadByGroupTypeRsp {
  private static readonly hdrSize = 2;
  private static readonly entryHdrSize = 4;

  static serialize(data: AttReadByGroupTypeRspMsg): Buffer {
    const { total, entry } = this.getSize(data);

    const buffer = Buffer.alloc(total);

    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ReadByGroupTypeRsp, o, 1);
    o = buffer.writeUIntLE(entry,                        o, 1);

    for (const entry of data.attributeDataList) {
      o  = buffer.writeUIntLE(entry.attributeHandle, o, 2);
      o  = buffer.writeUIntLE(entry.endGroupHandle,  o, 2);
      o += entry.attributeValue.copy(buffer, o);
    }

    return buffer;
  }

  private static getSize(data: AttReadByGroupTypeRspMsg): { total: number, entry: number } {
    let totalSize = this.hdrSize;
    let entrySize: number|null = null;
    for (const entry of data.attributeDataList) {
      const es = entry.attributeValue.length;

      totalSize += this.entryHdrSize + es;

      if (entrySize === null) {
        entrySize = es;
      }
      if (entrySize !== es) {
        throw new Error('Invalid ATT data');
      }
    }
    if (entrySize === null) {
      throw new Error('Invalid ATT data');
    }
    return { total: totalSize, entry: entrySize };
  }

  static deserialize(buffer: Buffer): AttReadByGroupTypeRspMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.ReadByGroupTypeRsp) {
      return null;
    }

    const length = buffer.readUInt8(1) - this.entryHdrSize;
    debug(buffer, length);

    const result: AttReadByGroupTypeRspMsg = { attributeDataList: [] };

    let o = 2;
    while (o < buffer.length) {
      const attributeHandle = buffer.readUInt16LE(o); o += 2;
      const endGroupHandle  = buffer.readUInt16LE(o); o += 2;
      const attributeValue  = buffer.subarray(o, o + length);
      o += length;

      result.attributeDataList.push({
        attributeHandle, endGroupHandle, attributeValue,
      });
    }

    return result;
  }
}

export interface AttWriteReqMsg {
  attributeHandle: number;
  attributeValue: Buffer;
}

export class AttWriteReq {
  private static readonly hdrSize = 3;

  static serialize(data: AttWriteReqMsg): Buffer {
    const buffer = Buffer.alloc(this.hdrSize + data.attributeValue.length);

    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.WriteReq,    o, 1);
    o = buffer.writeUIntLE(data.attributeHandle,  o, 2);
    data.attributeValue.copy(buffer, o);

    return buffer;
  }

  static deserialize(buffer: Buffer): AttWriteReqMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.WriteReq) {
      return null;
    }

    const result: AttWriteReqMsg = {
      attributeHandle: buffer.readUInt16LE(1),
      attributeValue:  buffer.subarray(3),
    };

    return result;
  }
}

export interface AttWriteRspMsg {
}

export class AttWriteRsp {
  static serialize(_: AttWriteRspMsg): Buffer {
    void _;
    return Buffer.from([ AttOpcode.WriteRsp ]);
  }

  static deserialize(buffer: Buffer): AttWriteRspMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.WriteRsp) {
      return null;
    }
    return {};
  }
}

export interface AttPrepareWriteReqMsg {
  attributeHandle: number;
  valueOffset: number;
  partAttributeValue: Buffer;
}

export class AttPrepareWriteReq {
  private static readonly hdrSize = 5;

  static serialize(data: AttPrepareWriteReqMsg): Buffer {
    const buffer = Buffer.alloc(this.hdrSize + data.partAttributeValue.length);

    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.PrepareWriteReq, o, 1);
    o = buffer.writeUIntLE(data.attributeHandle,      o, 2);
    o = buffer.writeUIntLE(data.valueOffset,          o, 2);
    data.partAttributeValue.copy(buffer, o);

    return buffer;
  }

  static deserialize(buffer: Buffer): AttPrepareWriteReqMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.PrepareWriteReq) {
      return null;
    }

    const result: AttPrepareWriteReqMsg = {
      attributeHandle:    buffer.readUInt16LE(1),
      valueOffset:        buffer.readUInt16LE(3),
      partAttributeValue: buffer.subarray(this.hdrSize),
    };

    return result;
  }
}

export interface AttPrepareWriteRspMsg {
  attributeHandle: number;
  valueOffset: number;
  partAttributeValue: Buffer;
}

export class AttPrepareWriteRsp {
  private static readonly hdrSize = 5;

  static serialize(data: AttPrepareWriteRspMsg): Buffer {
    const buffer = Buffer.alloc(this.hdrSize + data.partAttributeValue.length);

    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.PrepareWriteRsp, o, 1);
    o = buffer.writeUIntLE(data.attributeHandle,      o, 2);
    o = buffer.writeUIntLE(data.valueOffset,          o, 2);
    data.partAttributeValue.copy(buffer, o);

    return buffer;
  }

  static deserialize(buffer: Buffer): AttPrepareWriteRspMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.PrepareWriteRsp) {
      return null;
    }

    const result: AttPrepareWriteRspMsg = {
      attributeHandle:    buffer.readUInt16LE(1),
      valueOffset:        buffer.readUInt16LE(3),
      partAttributeValue: buffer.subarray(this.hdrSize),
    };

    return result;
  }
}

export enum AttExecuteWriteReqFlags {
  Cancel = 0,
  Write = 1,
}

export interface AttExecuteWriteReqMsg {
  flags: AttExecuteWriteReqFlags;
}

export class AttExecuteWriteReq {
  static serialize(data: AttExecuteWriteReqMsg): Buffer {
    return Buffer.from([
      AttOpcode.ExecuteWriteReq,
      data.flags
    ]);
  }

  static deserialize(buffer: Buffer): AttExecuteWriteReqMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.ExecuteWriteReq) {
      return null;
    }

    return { flags: buffer.readUInt8(1) };
  }
}

export interface AttExecuteWriteRspMsg {
}

export class AttExecuteWriteRsp {
  static serialize(_: AttExecuteWriteRspMsg): Buffer {
    void _;
    return Buffer.from([ AttOpcode.ExecuteWriteRsp ]);
  }

  static deserialize(buffer: Buffer): AttExecuteWriteRspMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.ExecuteWriteRsp) {
      return null;
    }
    return {};
  }
}

export interface AttReadMultipleVariableReqMsg {
  setOfHandles: Buffer;
}

export class AttReadMultipleVariableReq {
  static serialize(data: AttReadMultipleVariableReqMsg): Buffer {
    const buffer = Buffer.alloc(1 + data.setOfHandles.length);

    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ReadMultipleVariableReq, o, 1);
    data.setOfHandles.copy(buffer, o);

    return buffer;
  }

  static deserialize(buffer: Buffer): AttReadMultipleVariableReqMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.ReadMultipleVariableReq) {
      return null;
    }

    const result: AttReadMultipleVariableReqMsg = {
      setOfHandles: buffer.subarray(1),
    };

    return result;
  }
}

export interface AttReadMultipleVariableRspMsg {
  values: Buffer[];
}

export class AttReadMultipleVariableRsp {
  static serialize(data: AttReadMultipleVariableRspMsg): Buffer {
    const size = 1 + data.values.reduce((sum, entry) => sum + (2 + entry.length), 0);
    const buffer = Buffer.alloc(size);

    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.ReadMultipleVariableRsp, o, 1);

    for (const entry of data.values) {
      o  = buffer.writeUIntLE(entry.length, o, 2);
      o += entry.copy(buffer, o);
    }

    return buffer;
  }

  static deserialize(buffer: Buffer): AttReadMultipleVariableRspMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.ReadMultipleVariableRsp) {
      return null;
    }

    const result: AttReadMultipleVariableRspMsg = { values: [] };

    let o = 1;
    while (o < buffer.length) {
      const len = buffer.readUIntLE(o, 2); o += 2;
      result.values.push(buffer.subarray(o, o + len));
      o += len;
    }

    return result;
  }
}

export interface AttWriteCmdMsg {
  attributeHandle: number;
  attributeValue: Buffer;
}

export class AttWriteCmd {
  static serialize(data: AttWriteCmdMsg): Buffer {
    const buffer = Buffer.alloc(3 + data.attributeValue.length);

    let o = 0;
    o  = buffer.writeUIntLE(AttOpcode.WriteCmd,    o, 1);
    o  = buffer.writeUIntLE(data.attributeHandle,  o, 2);
    data.attributeValue.copy(buffer, o);

    return buffer;
  }

  static deserialize(buffer: Buffer): AttWriteCmdMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.WriteCmd) {
      return null;
    }

    return {
      attributeHandle: buffer.readUIntLE(1, 2),
      attributeValue: buffer.subarray(3),
    };
  }
}

export interface AttSignedWriteCmdMsg {
  attributeHandle: number;
  attributeValue: Buffer;
}

export class AttSignedWriteCmd {
  static serialize(data: AttSignedWriteCmdMsg): Buffer {
    const buffer = Buffer.alloc(3 + data.attributeValue.length);

    let o = 0;
    o  = buffer.writeUIntLE(AttOpcode.SignedWriteCmd, o, 1);
    o  = buffer.writeUIntLE(data.attributeHandle,     o, 2);
    data.attributeValue.copy(buffer, o);

    return buffer;
  }

  static deserialize(buffer: Buffer): AttSignedWriteCmdMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.SignedWriteCmd) {
      return null;
    }

    return {
      attributeHandle: buffer.readUIntLE(1, 2),
      attributeValue: buffer.subarray(3),
    };
  }
}

export interface AttHandleValueNtfMsg {
  attributeHandle: number;
  attributeValue: Buffer;
}

export class AttHandleValueNtf {
  static serialize(data: AttHandleValueNtfMsg): Buffer {
    const buffer = Buffer.alloc(3 + data.attributeValue.length);

    let o = 0;
    o  = buffer.writeUIntLE(AttOpcode.HandleValueNtf, o, 1);
    o  = buffer.writeUIntLE(data.attributeHandle,     o, 2);
    data.attributeValue.copy(buffer, o);

    return buffer;
  }

  static deserialize(buffer: Buffer): AttHandleValueNtfMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.HandleValueNtf) {
      return null;
    }

    return {
      attributeHandle: buffer.readUIntLE(1, 2),
      attributeValue: buffer.subarray(3),
    };
  }
}

export interface AttHandleValueIndMsg {
  attributeHandle: number;
  attributeValue: Buffer;
}

export class AttHandleValueInd {
  static serialize(data: AttHandleValueIndMsg): Buffer {
    const buffer = Buffer.alloc(3 + data.attributeValue.length);

    let o = 0;
    o  = buffer.writeUIntLE(AttOpcode.HandleValueInd, o, 1);
    o  = buffer.writeUIntLE(data.attributeHandle,     o, 2);
    data.attributeValue.copy(buffer, o);

    return buffer;
  }

  static deserialize(buffer: Buffer): AttHandleValueIndMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.HandleValueInd) {
      return null;
    }

    return {
      attributeHandle: buffer.readUIntLE(1, 2),
      attributeValue: buffer.subarray(3),
    };
  }
}

export interface AttHandleValueCfmMsg {
}

export class AttHandleValueCfm {
  static serialize(_: AttHandleValueCfmMsg): Buffer {
    void _;
    return Buffer.from([AttOpcode.HandleValueCfm]);
  }

  static deserialize(buffer: Buffer): AttHandleValueCfmMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.HandleValueCfm) {
      return null;
    }

    return {};
  }
}

export interface AttMultipleHandleValueNtfMsg {
  values: {
    attributeHandle: number;
    attributeValue: Buffer;
  }[];
}

export class AttMultipleHandleValueNtf {
  static serialize(data: AttMultipleHandleValueNtfMsg): Buffer {
    const size = 1 + data.values.reduce((sum, entry) => sum + (4 + entry.attributeValue.length), 0);
    const buffer = Buffer.alloc(size);

    let o = 0;
    o = buffer.writeUIntLE(AttOpcode.MultipleHandleValueNtf, o, 1);

    for (const entry of data.values) {
      o  = buffer.writeUIntLE(entry.attributeHandle,        o, 2);
      o  = buffer.writeUIntLE(entry.attributeValue.length,  o, 2);
      o += entry.attributeValue.copy(buffer, o);
    }

    return buffer;
  }

  static deserialize(buffer: Buffer): AttMultipleHandleValueNtfMsg|null {
    if (buffer.length        <  1 ||
        buffer.readUInt8(0) !== AttOpcode.MultipleHandleValueNtf) {
      return null;
    }

    const result: AttMultipleHandleValueNtfMsg = { values: [] };

    let o = 1;
    while (o < buffer.length) {
      const handle = buffer.readUIntLE(o, 2); o += 2;
      const length = buffer.readUIntLE(o, 2); o += 2;
      result.values.push({
        attributeHandle: handle,
        attributeValue: buffer.subarray(o, o + length),
      });
      o += length;
    }

    return result;
  }
}
