import { Att } from '../att/Att';
import { UUID } from '../utils/UUID';
import { bitGet } from '../utils/Utils';

export interface AttDataEntry {
  handle: number;
  value: Buffer;
  endingHandle: number;
}

export enum CharacteristicPropertiesBits {
  // If set, permits broadcasts of the Characteristic Value using
  // Server Characteristic Configuration Descriptor. If set, the Server
  // Characteristic Configuration Descriptor shall exist.
  Broadcast = 0x01,

  // If set, permits reads of the Characteristic Value using procedures
  // defined in Section 4.8
  Read = 0x02,

  // If set, permit writes of the Characteristic Value without response
  // using procedures defined in Section 4.9.1.
  WriteWithoutResponse = 0x04,

  // If set, permits writes of the Characteristic Value with response
  // using procedures defined in Section 4.9.3 or Section 4.9.4.
  Write = 0x08,

  // If set, permits notifications of a Characteristic Value without
  // acknowledgment using the procedure defined in Section 4.10. If
  // set, the Client Characteristic Configuration Descriptor shall exist.
  Notify = 0x10,

  // If set, permits indications of a Characteristic Value with acknowledgment
  // using the procedure defined in Section 4.11. If set, the
  // Client Characteristic Configuration Descriptor shall exist.
  Indicate = 0x20,

  // If set, permits signed writes to the Characteristic Value using the
  // procedure defined in Section 4.9.2.
  AuthenticatedSignedWrites = 0x40,

  // If set, additional characteristic properties are defined in the Characteristic
  // Extended Properties Descriptor defined in Section 3.3.3.1.
  // If set, the Characteristic Extended Properties Descriptor shall exist.
  ExtendedProperties = 0x80,
}

export interface CharacteristicProperties {
  broadcast: boolean;
  read: boolean;
  writeWithoutResponse: boolean;
  write: boolean;
  notify: boolean;
  indicate: boolean;
  authenticatedSignedWrites: boolean;
  extendedProperties: boolean;
}

export class GattService {
  private handle: number;
  private endingHandle: number;
  private uuid: string;

  public get Handle(): number { return this.handle; }
  public get EndingHandle(): number { return this.endingHandle; }
  public get UUID(): string { return this.uuid; }

  public static fromAttData(data: AttDataEntry): GattService {
    return new GattService(data);
  }

  private constructor(private data: AttDataEntry) {
    this.handle = data.handle;
    this.endingHandle = data.endingHandle;
    this.uuid = UUID.toString(this.data.value);
  }

  public toObject() {
    return {
      handle: this.Handle,
      endingHandle: this.EndingHandle,
      uuid: this.UUID,
    };
  }

  get [Symbol.toStringTag]() {
    return `${this.UUID}@${this.Handle}`;
  }
}

export class GattIncService {
  private handle: number;
  private endingHandle: number;
  private uuid: string;

  public get Handle(): number { return this.handle; }
  public get EndingHandle(): number { return this.endingHandle; }
  public get UUID(): string { return this.uuid; }

  public static fromAttData(data: AttDataEntry): GattIncService {
    return new GattIncService(data);
  }

  private constructor(private data: AttDataEntry) {
    this.handle = data.handle;
    this.endingHandle = data.endingHandle;
    this.uuid = UUID.toString(this.data.value);
  }

  public toObject() {
    return {
      handle: this.Handle,
      endingHandle: this.EndingHandle,
      uuid: this.UUID,
    };
  }

  get [Symbol.toStringTag]() {
    return `${this.UUID}@${this.Handle}`;
  }
}

export class GattCharacteristic {
  private handle: number;
  private endingHandle: number;
  private valueHandle: number;
  private properties: CharacteristicProperties;
  private uuid: string;

  public get Handle(): number { return this.handle; }
  public get EndingHandle(): number { return this.endingHandle; }
  public get ValueHandle(): number { return this.valueHandle; }
  public get UUID(): string { return this.uuid; }
  public get Properties(): CharacteristicProperties { return this.properties; }

  public static fromAttData(data: AttDataEntry): GattCharacteristic {
    return new GattCharacteristic(data);
  }

  private constructor(private data: AttDataEntry) {
    const properties  = this.data.value.readUInt8(0);
    const valueHandle = this.data.value.readUInt16LE(1);
    const uuid        = this.data.value.slice(3);

    this.handle       = this.data.handle;
    this.endingHandle = this.data.endingHandle;
    this.properties   = this.parseProperties(properties);
    this.valueHandle  = valueHandle;
    this.uuid         = UUID.toString(uuid);
  }

  public toObject() {
    return {
      handle: this.Handle,
      endingHandle: this.EndingHandle,
      valueHandle: this.ValueHandle,
      uuid: this.UUID,
      properties: this.Properties,
    };
  }

  private parseProperties(bitsfield: number): CharacteristicProperties {
    return {
      broadcast:                  bitGet(bitsfield, CharacteristicPropertiesBits.Broadcast),
      read:                       bitGet(bitsfield, CharacteristicPropertiesBits.Read),
      writeWithoutResponse:       bitGet(bitsfield, CharacteristicPropertiesBits.WriteWithoutResponse),
      write:                      bitGet(bitsfield, CharacteristicPropertiesBits.Write),
      notify:                     bitGet(bitsfield, CharacteristicPropertiesBits.Notify),
      indicate:                   bitGet(bitsfield, CharacteristicPropertiesBits.Indicate),
      authenticatedSignedWrites:  bitGet(bitsfield, CharacteristicPropertiesBits.AuthenticatedSignedWrites),
      extendedProperties:         bitGet(bitsfield, CharacteristicPropertiesBits.ExtendedProperties),
    };
  }

  get [Symbol.toStringTag]() {
    return `${this.UUID}@${this.Handle} <-> ${this.ValueHandle}`;
  }
}

export class GattDescriptor {
  private handle: number;
  private endingHandle: number;
  private uuid: string;

  public get Handle(): number { return this.handle; }
  public get EndingHandle(): number { return this.endingHandle; }
  public get UUID(): string { return this.uuid; }

  public static fromAttData(data: AttDataEntry): GattDescriptor {
    return new GattDescriptor(data);
  }

  private constructor(private data: AttDataEntry) {
    this.handle       = this.data.handle;
    this.endingHandle = this.data.endingHandle;
    this.uuid         = UUID.toString(this.data.value);
  }

  public toObject() {
    return {
      handle: this.Handle,
      endingHandle: this.EndingHandle,
      uuid: this.UUID,
    };
  }

  get [Symbol.toStringTag]() {
    return `${this.UUID}@${this.Handle}`;
  }
}

export class Gatt {
  private readonly GATT_PRIM_SVC_UUID = Buffer.from([0x00, 0x28]);
  private readonly GATT_INCLUDE_UUID = Buffer.from([0x02, 0x28]);
  private readonly GATT_CHARAC_UUID = Buffer.from([0x03, 0x28]);

  constructor(private att: Att) {}

  public async discoverServices(): Promise<GattService[]> {
    const entries = await this.readByGroupTypeReq(this.GATT_PRIM_SVC_UUID, 1, 0xFFFF);
    return entries.map((e) => GattService.fromAttData(e));
  }

  public async discoverIncludedServices(service: GattService): Promise<GattIncService[]> {
    const entries = await this.readByType(this.GATT_INCLUDE_UUID, service.Handle, service.EndingHandle);
    return entries.map((e) => GattIncService.fromAttData(e));
  }

  public async discoverCharacteristics(service: GattService): Promise<GattCharacteristic[]> {
    const entries = await this.readByType(this.GATT_CHARAC_UUID, service.Handle, service.EndingHandle);
    return entries.map((e) => GattCharacteristic.fromAttData(e));
  }

  public async discoverDescriptors(characteristic: GattCharacteristic) {
    const entries = await this.findInformation(characteristic.Handle, characteristic.EndingHandle);
    return entries.map((e) => GattDescriptor.fromAttData(e));
  }

  private async readByGroupTypeReq(attributeGroupType: Buffer, startingHandle: number, endingHandle: number): Promise<AttDataEntry[]> {
    const attributeData: AttDataEntry[] = [];
    try {
      --startingHandle;
      while (startingHandle < endingHandle) {
        const data = await this.att.readByGroupTypeReq({
          startingHandle: startingHandle + 1,
          endingHandle: endingHandle,
          attributeGroupType,
        });
        for (const entry of data?.attributeDataList ?? []) {
          attributeData.push({
            handle: entry.attributeHandle,
            value: entry.attributeValue,
            endingHandle: entry.endGroupHandle,
          });
        }
        startingHandle = data?.attributeDataList.at(-1)?.endGroupHandle ?? endingHandle;
      }
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code !== 'AttributeNotFound') {
        throw err;
      }
    }
    return attributeData;
  }

  private async readByType(attributeType: Buffer, startingHandle: number, endingHandle: number): Promise<AttDataEntry[]> {
    const attributeData: AttDataEntry[] = [];
    try {
      --startingHandle;
      while (startingHandle < endingHandle) {
        const data = await this.att.readByTypeReq({
          startingHandle: startingHandle + 1,
          endingHandle: endingHandle,
          attributeType,
        });
        for (const entry of data?.attributeDataList ?? []) {
          const previous = attributeData.at(-1);
          if (previous) {
            previous.endingHandle = entry.handle - 1;
          }
          attributeData.push({ handle: entry.handle, value: entry.value, endingHandle });
        }
        startingHandle = data?.attributeDataList.at(-1)?.handle ?? endingHandle;
      }
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code !== 'AttributeNotFound') {
        throw err;
      }
    }
    return attributeData;
  }

  private async findInformation(startingHandle: number, endingHandle: number): Promise<AttDataEntry[]> {
    const attributeData: AttDataEntry[] = [];
    try {
      while (startingHandle < endingHandle) {
        const data = await this.att.findInformationReq({
          startingHandle: startingHandle + 1,
          endingHandle: endingHandle,
        });
        for (const entry of data) {
          const previous = attributeData.at(-1);
          if (previous) {
            previous.endingHandle = entry.handle - 1;
          }
          attributeData.push({ handle: entry.handle, value: entry.uuid, endingHandle });
        }
        startingHandle = data.at(-1)?.handle ?? endingHandle;
      }
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code !== 'AttributeNotFound') {
        throw err;
      }
    }
    return attributeData;
  }
}
