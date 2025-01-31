// NOTE:
// https://www.bluetooth.com/specifications/assigned-numbers/generic-access-profile/
import { UUID } from "../utils/UUID.ts";

export interface AdvDataField {
  type: number;
  data: Buffer;
}

// prettier-ignore
export const AdvDataType = Object.freeze({
  Flags:                                    0x01, // *
  IncompleteListOf16bitServiceClassUuids:   0x02, // *
  CompleteListOf16bitServiceClassUuids:     0x03, // *
  IncompleteListOf32bitServiceClassUuids:   0x04, // *
  CompleteListOf32bitServiceClassUuids:     0x05, // *
  IncompleteListOf128bitServiceClassUuids:  0x06, // *
  CompleteListOf128bitServiceClassUuids:    0x07, // *
  ShortenedLocalName:                       0x08, // *
  CompleteLocalName:                        0x09, // *
  TxPowerLevel:                             0x0A, // *
  ClassOfDevice:                            0x0D,
  SimplePairingHashC192:                    0x0E,
  SimplePairingRandomizerR192:              0x0F,
  DeviceId:                                 0x10,
  SecurityManagerTkValue:                   0x10,
  SecurityManagerOobFlags:                  0x11,
  SlaveConnectionIntervalRange:             0x12,
  ListOf16bitServiceSolicitationUuids:      0x14, // *
  ListOf128bitServiceSolicitationUuids:     0x15, // *
  ServiceData16bitUuid:                     0x16, // *
  PublicTargetAddress:                      0x17,
  RandomTargetAddress:                      0x18,
  Appearance:                               0x19, // *
  AdvertisingInterval:                      0x1A,
  LeBluetoothDeviceAddress:                 0x1B,
  LeRole:                                   0x1C,
  SimplePairingHashC256:                    0x1D,
  SimplePairingRandomizerR256:              0x1E,
  ListOf32bitServiceSolicitationUuids:      0x1F, // *
  ServiceData32bitUuid:                     0x20, // *
  ServiceData128bitUuid:                    0x21, // *
  LeSecureConnectionsConfirmationValue:     0x22,
  LeSecureConnectionsRandomValue:           0x23,
  Uri:                                      0x24,
  IndoorPositioning:                        0x25,
  TransportDiscoveryData:                   0x26,
  LeSupportedFeatures:                      0x27,
  ChannelMapUpdateIndication:               0x28,
  PbAdv:                                    0x29,
  MeshMessage:                              0x2A,
  MeshBeacon:                               0x2B,
  BigInfo:                                  0x2C,
  BroadcastCode:                            0x2D,
  InformationData3d:                        0x3D,
  ManufacturerSpecificData:                 0xFF, // *
} as const);

export type AdvDataType = (typeof AdvDataType)[keyof typeof AdvDataType];

export const AdvDataTypeLabel = {
  0x01: "Flags",
  0x02: "Incomplete List of 16-bit Service Class UUIDs",
  0x03: "Complete List of 16-bit Service Class UUIDs",
  0x04: "Incomplete List of 32-bit Service Class UUIDs",
  0x05: "Complete List of 32-bit Service Class UUIDs",
  0x06: "Incomplete List of 128-bit Service Class UUIDs",
  0x07: "Complete List of 128-bit Service Class UUIDs",
  0x08: "Shortened Local Name",
  0x09: "Complete Local Name",
  0x0a: "Tx Power Level",
  0x0d: "Class of Device",
  0x0e: "Simple Pairing Hash C-192",
  0x0f: "Simple Pairing Randomizer R-192",
  0x10: "Device ID",
  // 0x10: "Security Manager TK Value",
  0x11: "Security Manager Out of Band Flags",
  0x12: "Slave Connection Interval Range",
  0x14: "List of 16-bit Service Solicitation UUIDs",
  0x15: "List of 128-bit Service Solicitation UUIDs",
  0x16: "Service Data - 16-bit UUID",
  0x17: "Public Target Address",
  0x18: "Random Target Address",
  0x19: "Appearance",
  0x1a: "Advertising Interval",
  0x1b: "LE Bluetooth Device Address",
  0x1c: "LE Role",
  0x1d: "Simple Pairing Hash C-256",
  0x1e: "Simple Pairing Randomizer R-256",
  0x1f: "List of 32-bit Service Solicitation UUIDs",
  0x20: "Service Data - 32-bit UUID",
  0x21: "Service Data - 128-bit UUID",
  0x22: "LE Secure Connections Confirmation Value",
  0x23: "LE Secure Connections Random Value",
  0x24: "URI",
  0x25: "Indoor Positioning",
  0x26: "Transport Discovery Data",
  0x27: "LE Supported Features",
  0x28: "Channel Map Update Indication",
  0x29: "PB-ADV",
  0x2a: "Mesh Message",
  0x2b: "Mesh Beacon",
  0x2c: "BIGInfo",
  0x2d: "Broadcast_Code",
  0x3d: "3D Information Data",
  0xff: "Manufacturer Specific Data",
};

interface AdvDataServcieData {
  uuid: string;
  data: Buffer;
}

export interface AdvDataAppearance {
  category: number;
  subcategory: number;
  value: number;
}

export interface AdvData {
  flags?: number;
  incompleteListOf16bitServiceClassUuids?: string[];
  completeListOf16bitServiceClassUuids?: string[];
  incompleteListOf32bitServiceClassUuids?: string[];
  completeListOf32bitServiceClassUuids?: string[];
  incompleteListOf128bitServiceClassUuids?: string[];
  completeListOf128bitServiceClassUuids?: string[];
  listOf16bitServiceSolicitationUuids?: string[];
  listOf32bitServiceSolicitationUuids?: string[];
  listOf128bitServiceSolicitationUuids?: string[];
  shortenedLocalName?: string;
  completeLocalName?: string;
  txPowerLevel?: number;
  manufacturerData?: {
    ident: number;
    data: Buffer;
  };
  serviceData16bitUuid?: AdvDataServcieData[];
  serviceData32bitUuid?: AdvDataServcieData[];
  serviceData128bitUuid?: AdvDataServcieData[];
  appearance?: AdvDataAppearance;
  unparsed?: { [key: number]: Buffer };
}

export class AdvData {
  static build(advData: AdvData): Buffer {
    let buffer = Buffer.alloc(0);

    if (advData.flags) {
      buffer = Buffer.concat([buffer, this.buildFlags(advData.flags)]);
    }
    if (advData.incompleteListOf16bitServiceClassUuids) {
      const list = this.buildListOfServiceClassUuids(
        AdvDataType.IncompleteListOf16bitServiceClassUuids,
        16,
        advData.incompleteListOf16bitServiceClassUuids,
      );
      buffer = Buffer.concat([buffer, list]);
    }
    if (advData.completeListOf16bitServiceClassUuids) {
      const list = this.buildListOfServiceClassUuids(
        AdvDataType.CompleteListOf16bitServiceClassUuids,
        16,
        advData.completeListOf16bitServiceClassUuids,
      );
      buffer = Buffer.concat([buffer, list]);
    }
    if (advData.incompleteListOf32bitServiceClassUuids) {
      const list = this.buildListOfServiceClassUuids(
        AdvDataType.IncompleteListOf32bitServiceClassUuids,
        32,
        advData.incompleteListOf32bitServiceClassUuids,
      );
      buffer = Buffer.concat([buffer, list]);
    }
    if (advData.completeListOf32bitServiceClassUuids) {
      const list = this.buildListOfServiceClassUuids(
        AdvDataType.CompleteListOf32bitServiceClassUuids,
        32,
        advData.completeListOf32bitServiceClassUuids,
      );
      buffer = Buffer.concat([buffer, list]);
    }
    if (advData.incompleteListOf128bitServiceClassUuids) {
      const list = this.buildListOfServiceClassUuids(
        AdvDataType.IncompleteListOf128bitServiceClassUuids,
        128,
        advData.incompleteListOf128bitServiceClassUuids,
      );
      buffer = Buffer.concat([buffer, list]);
    }
    if (advData.completeListOf128bitServiceClassUuids) {
      const list = this.buildListOfServiceClassUuids(
        AdvDataType.CompleteListOf128bitServiceClassUuids,
        128,
        advData.completeListOf128bitServiceClassUuids,
      );
      buffer = Buffer.concat([buffer, list]);
    }
    if (advData.completeLocalName) {
      const name = this.buildName(AdvDataType.CompleteLocalName, advData.completeLocalName);
      buffer = Buffer.concat([buffer, name]);
    }
    if (advData.shortenedLocalName) {
      const name = this.buildName(AdvDataType.ShortenedLocalName, advData.shortenedLocalName);
      buffer = Buffer.concat([buffer, name]);
    }
    if (advData.txPowerLevel) {
      const power = this.buildTxPowerLevel(advData.txPowerLevel);
      buffer = Buffer.concat([buffer, power]);
    }
    if (advData.listOf16bitServiceSolicitationUuids) {
      const list = this.buildListOfServiceClassUuids(
        AdvDataType.ListOf16bitServiceSolicitationUuids,
        16,
        advData.listOf16bitServiceSolicitationUuids,
      );
      buffer = Buffer.concat([buffer, list]);
    }
    if (advData.listOf32bitServiceSolicitationUuids) {
      const list = this.buildListOfServiceClassUuids(
        AdvDataType.ListOf32bitServiceSolicitationUuids,
        32,
        advData.listOf32bitServiceSolicitationUuids,
      );
      buffer = Buffer.concat([buffer, list]);
    }
    if (advData.listOf128bitServiceSolicitationUuids) {
      const list = this.buildListOfServiceClassUuids(
        AdvDataType.ListOf128bitServiceSolicitationUuids,
        128,
        advData.listOf128bitServiceSolicitationUuids,
      );
      buffer = Buffer.concat([buffer, list]);
    }
    if (advData.serviceData16bitUuid) {
      for (const serviceData of advData.serviceData16bitUuid) {
        const data = this.buildServiceData(AdvDataType.ServiceData16bitUuid, serviceData, 16);
        buffer = Buffer.concat([buffer, data]);
      }
    }
    if (advData.appearance) {
      const data = this.buildAppearance(advData.appearance);
      buffer = Buffer.concat([buffer, data]);
    }
    if (advData.serviceData32bitUuid) {
      for (const serviceData of advData.serviceData32bitUuid) {
        const data = this.buildServiceData(AdvDataType.ServiceData32bitUuid, serviceData, 32);
        buffer = Buffer.concat([buffer, data]);
      }
    }
    if (advData.serviceData128bitUuid) {
      for (const serviceData of advData.serviceData128bitUuid) {
        const data = this.buildServiceData(AdvDataType.ServiceData128bitUuid, serviceData, 128);
        buffer = Buffer.concat([buffer, data]);
      }
    }
    if (advData.manufacturerData) {
      buffer = Buffer.concat([buffer, this.buildManufData(advData.manufacturerData)]);
    }

    return buffer;
  }

  private static buildFlags(flags: number): Buffer {
    const buffer = Buffer.alloc(3);
    buffer[0] = 2;
    buffer[1] = AdvDataType.Flags;
    buffer[2] = flags;
    return buffer;
  }

  private static buildListOfServiceClassUuids(type: AdvDataType, bits: number, list: string[]): Buffer {
    const bytes = bits / 8;
    const buffer = Buffer.alloc(2 + list.length * bytes);

    buffer[0] = buffer.length - 1;
    buffer[1] = type;

    let o = 2;
    for (const uuid of list) {
      UUID.from(uuid).copy(buffer, o);
      o += bytes;
    }

    return buffer;
  }

  private static buildName(type: AdvDataType, name: string): Buffer {
    const nameBuffer = Buffer.from(name, "utf8");
    const buffer = Buffer.alloc(2 + nameBuffer.length);
    buffer.writeUIntLE(buffer.length - 1, 0, 1);
    buffer.writeUIntLE(type, 1, 1);
    nameBuffer.copy(buffer, 2);
    return buffer;
  }

  private static buildTxPowerLevel(txPowerLevel: number): Buffer {
    const buffer = Buffer.alloc(3);
    buffer[0] = 2;
    buffer[1] = AdvDataType.TxPowerLevel;
    buffer[2] = txPowerLevel;
    return buffer;
  }

  private static buildServiceData(type: AdvDataType, serviceData: AdvDataServcieData, uuidBits: number): Buffer {
    const buffer = Buffer.alloc(2 + 2 + serviceData.data.length);
    buffer[0] = buffer.length - 1;
    buffer[1] = type;
    UUID.from(serviceData.uuid).copy(buffer, 2);
    serviceData.data.copy(buffer, 2 + uuidBits / 8);
    return buffer;
  }

  private static buildAppearance(appearance: AdvDataAppearance): Buffer {
    const buffer = Buffer.alloc(2 + 2);
    buffer[0] = buffer.length - 1;
    buffer[1] = AdvDataType.Appearance;
    const value = (appearance.category << 6) | (appearance.subcategory << 0);
    buffer.writeUint16LE(value, 2);
    return buffer;
  }

  private static buildManufData(manufData: Required<AdvData>["manufacturerData"]): Buffer {
    const buffer = Buffer.alloc(2 + 2 + manufData.data.length);
    buffer.writeUIntLE(buffer.length - 1, 0, 1);
    buffer.writeUIntLE(AdvDataType.ManufacturerSpecificData, 1, 1);
    buffer.writeUIntLE(manufData.ident, 2, 2);
    manufData.data.copy(buffer, 4);
    return buffer;
  }

  static parse(advData: Buffer): AdvData {
    const ad: AdvData = {};

    if (!advData) {
      return ad;
    }

    const fields: AdvDataField[] = [];

    let o = 0;
    while (o < advData.length) {
      const len = advData[o++];

      if (len === 0 || o >= advData.length) {
        continue;
      }

      const type = advData[o++];
      const data = advData.subarray(o, o + (len - 1));

      o += len - 1;

      fields.push({ type, data });
    }

    for (const field of fields) {
      this.parseField(ad, field);
    }

    return ad;
  }

  private static parseField(advData: AdvData, field: { type: number; data: Buffer }): void {
    switch (field.type) {
      case AdvDataType.Flags: {
        advData.flags = field.data[0];
        break;
      }
      case AdvDataType.IncompleteListOf16bitServiceClassUuids: {
        const uuids = this.parseServiceClassUuids(field.data, 2);
        advData.incompleteListOf16bitServiceClassUuids = advData.incompleteListOf16bitServiceClassUuids ?? [];
        advData.incompleteListOf16bitServiceClassUuids.push(...uuids);
        break;
      }
      case AdvDataType.CompleteListOf16bitServiceClassUuids: {
        const uuids = this.parseServiceClassUuids(field.data, 2);
        advData.completeListOf16bitServiceClassUuids = advData.completeListOf16bitServiceClassUuids ?? [];
        advData.completeListOf16bitServiceClassUuids.push(...uuids);
        break;
      }
      case AdvDataType.IncompleteListOf32bitServiceClassUuids: {
        const uuids = this.parseServiceClassUuids(field.data, 4);
        advData.incompleteListOf32bitServiceClassUuids = advData.incompleteListOf32bitServiceClassUuids ?? [];
        advData.incompleteListOf32bitServiceClassUuids.push(...uuids);
        break;
      }
      case AdvDataType.CompleteListOf32bitServiceClassUuids: {
        const uuids = this.parseServiceClassUuids(field.data, 4);
        advData.completeListOf32bitServiceClassUuids = advData.completeListOf32bitServiceClassUuids ?? [];
        advData.completeListOf32bitServiceClassUuids.push(...uuids);
        break;
      }
      case AdvDataType.IncompleteListOf128bitServiceClassUuids: {
        const uuids = this.parseServiceClassUuids(field.data, 16);
        advData.incompleteListOf128bitServiceClassUuids = advData.incompleteListOf128bitServiceClassUuids ?? [];
        advData.incompleteListOf128bitServiceClassUuids.push(...uuids);
        break;
      }
      case AdvDataType.CompleteListOf128bitServiceClassUuids: {
        const uuids = this.parseServiceClassUuids(field.data, 16);
        advData.completeListOf128bitServiceClassUuids = advData.completeListOf128bitServiceClassUuids ?? [];
        advData.completeListOf128bitServiceClassUuids.push(...uuids);
        break;
      }
      case AdvDataType.ShortenedLocalName: {
        advData.shortenedLocalName = field.data.toString("utf8");
        break;
      }
      case AdvDataType.CompleteLocalName: {
        advData.completeLocalName = field.data.toString("utf8");
        break;
      }
      case AdvDataType.TxPowerLevel: {
        advData.txPowerLevel = field.data.readInt8(0);
        break;
      }
      case AdvDataType.ListOf16bitServiceSolicitationUuids: {
        const uuids = this.parseServiceClassUuids(field.data, 2);
        advData.listOf16bitServiceSolicitationUuids = advData.listOf16bitServiceSolicitationUuids ?? [];
        advData.listOf16bitServiceSolicitationUuids.push(...uuids);
        break;
      }
      case AdvDataType.ListOf32bitServiceSolicitationUuids: {
        const uuids = this.parseServiceClassUuids(field.data, 4);
        advData.listOf32bitServiceSolicitationUuids = advData.listOf32bitServiceSolicitationUuids ?? [];
        advData.listOf32bitServiceSolicitationUuids.push(...uuids);
        break;
      }
      case AdvDataType.ListOf128bitServiceSolicitationUuids: {
        const uuids = this.parseServiceClassUuids(field.data, 16);
        advData.listOf128bitServiceSolicitationUuids = advData.listOf128bitServiceSolicitationUuids ?? [];
        advData.listOf128bitServiceSolicitationUuids.push(...uuids);
        break;
      }
      case AdvDataType.ServiceData16bitUuid: {
        advData.serviceData16bitUuid = advData.serviceData16bitUuid ?? [];
        advData.serviceData16bitUuid.push({
          uuid: field.data.subarray(0, 2).reverse().toString("hex"),
          data: field.data.subarray(2, field.data.length),
        });
        break;
      }
      case AdvDataType.Appearance: {
        const value = field.data.readUInt16LE(0);
        advData.appearance = {
          category: (value >> 6) & 0x3ff,
          subcategory: (value >> 0) & 0x03f,
          value,
        };
        break;
      }
      case AdvDataType.ServiceData32bitUuid: {
        advData.serviceData32bitUuid = advData.serviceData32bitUuid ?? [];
        advData.serviceData32bitUuid.push({
          uuid: field.data.subarray(0, 4).reverse().toString("hex"),
          data: field.data.subarray(4, field.data.length),
        });
        break;
      }
      case AdvDataType.ServiceData128bitUuid: {
        advData.serviceData128bitUuid = advData.serviceData128bitUuid ?? [];
        advData.serviceData128bitUuid.push({
          uuid: field.data.subarray(0, 16).reverse().toString("hex"),
          data: field.data.subarray(16, field.data.length),
        });
        break;
      }
      case AdvDataType.ManufacturerSpecificData: {
        advData.manufacturerData = {
          ident: field.data.readUInt16LE(0),
          data: field.data.subarray(2),
        };
        break;
      }
      default: {
        advData.unparsed = advData.unparsed ?? {};
        advData.unparsed[field.type] = field.data;
        break;
      }
    }
  }

  private static parseServiceClassUuids(data: Buffer, size: number): string[] {
    const uuids: string[] = [];
    for (let i = 0; i < data.length; i += size) {
      const uuid = data
        .subarray(i, i + size)
        .reverse()
        .toString("hex");
      uuids.push(uuid);
    }
    return uuids;
  }
}
