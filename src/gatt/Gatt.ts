import { Att } from '../att/Att';
import { AttAttributeDataEntry, AttReadByGroupTypeRspMsg, AttReadByTypeRspMsg } from '../att/AttSerDes';
import { UUID } from '../utils/UUID';
import { bitGet } from '../utils/Utils';

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
  AuthenticatedSignedWrites: boolean;
  extendedProperties: boolean;
}

export class GattService {
  private uuid: string;

  public get Handle(): number { return this.handle; }
  public get UUID(): string { return this.uuid; }
  public get EndHandle(): number { return this.endGroupHandle; }

  public static fromAttData(data: AttReadByGroupTypeRspMsg['attributeDataList'][0]): GattService {
    return new GattService(data.attributeHandle, data.attributeValue, data.endGroupHandle);
  }

  private constructor(private handle: number, private uuidBuffer: Buffer, private endGroupHandle: number) {
    this.uuid = UUID.toString(this.uuidBuffer);
  }

  public toObject() {
    return {
      handle: this.Handle,
      uuid: this.UUID,
      endGroupHandle: this.endGroupHandle,
    };
  }
}

export class GattIncService {
  private uuid: string;

  public get Handle(): number { return this.handle; }
  public get UUID(): string { return this.uuid; }

  public static fromAttData(data: AttAttributeDataEntry): GattIncService {
    return new GattIncService(data.handle, data.value);
  }

  private constructor(private handle: number, private uuidBuffer: Buffer) {
    this.uuid = UUID.toString(this.uuidBuffer);
  }

  public toObject() {
    return { handle: this.Handle, uuid: this.UUID };
  }
}

export class GattCharacteristic {
  private properties: CharacteristicProperties;
  private uuid: string;

  public get Handle(): number { return this.handle; }
  public get ValueHandle(): number { return this.valueHandle; }
  public get UUID(): string { return this.uuid; }
  public get Properties(): CharacteristicProperties { return this.properties; }

  public static fromAttData(data: AttAttributeDataEntry): GattCharacteristic {
    const handle      = data.handle;
    const properties  = data.value.readUInt8(0);
    const valueHandle = data.value.readUInt16LE(1);
    const uuidBuffer  = data.value.slice(3);
    return new GattCharacteristic(handle, properties, uuidBuffer, valueHandle);
  }

  private constructor(
      private handle: number,
      private propertiesBitsfield: number,
      private uuidBuffer: Buffer,
      private valueHandle: number) {
    this.uuid = UUID.toString(this.uuidBuffer);
    this.properties = this.parseProperties();
  }

  public toObject() {
    return {
      handle: this.handle,
      valueHandle: this.valueHandle,
      uuid: this.uuid,
      properties: this.properties,
    };
  }

  private parseProperties(): CharacteristicProperties {
    return {
      broadcast:                  bitGet(this.propertiesBitsfield, CharacteristicPropertiesBits.Broadcast),
      read:                       bitGet(this.propertiesBitsfield, CharacteristicPropertiesBits.Read),
      writeWithoutResponse:       bitGet(this.propertiesBitsfield, CharacteristicPropertiesBits.WriteWithoutResponse),
      write:                      bitGet(this.propertiesBitsfield, CharacteristicPropertiesBits.Write),
      notify:                     bitGet(this.propertiesBitsfield, CharacteristicPropertiesBits.Notify),
      indicate:                   bitGet(this.propertiesBitsfield, CharacteristicPropertiesBits.Indicate),
      AuthenticatedSignedWrites:  bitGet(this.propertiesBitsfield, CharacteristicPropertiesBits.AuthenticatedSignedWrites),
      extendedProperties:         bitGet(this.propertiesBitsfield, CharacteristicPropertiesBits.ExtendedProperties),
    };
  }
}

export class Gatt {
  private readonly GATT_PRIM_SVC_UUID = Buffer.from([0x00, 0x28]);
  private readonly GATT_INCLUDE_UUID = Buffer.from([0x02, 0x28]);
  private readonly GATT_CHARAC_UUID = Buffer.from([0x03, 0x28]);

  constructor(private att: Att) {}

  async discoverServices(): Promise<GattService[]> {
    const entries = await this.readByGroupTypeReq(this.GATT_PRIM_SVC_UUID, 1, 0xFFFF);
    return entries.map((e) => GattService.fromAttData(e));
  }

  async discoverIncludedServices(service: GattService): Promise<GattIncService[]> {
    const entries = await this.readByType(this.GATT_INCLUDE_UUID, service.Handle, service.EndHandle);
    return entries.map((e) => GattIncService.fromAttData(e));
  }

  async discoverCharacteristics(service: GattService): Promise<GattCharacteristic[]> {
    const entries = await this.readByType(this.GATT_CHARAC_UUID, service.Handle, service.EndHandle);
    return entries.map((e) => GattCharacteristic.fromAttData(e));
  }

  private async readByGroupTypeReq(attributeGroupType: Buffer, startingHandle: number, endingHandle: number): Promise<AttReadByGroupTypeRspMsg['attributeDataList']> {
    const attributeData: AttReadByGroupTypeRspMsg = { attributeDataList: [] };
    try {
      --startingHandle;
      while (startingHandle < endingHandle) {
        const data = await this.att.readByGroupTypeReq({
          startingHandle: startingHandle + 1,
          endingHandle: endingHandle,
          attributeGroupType,
        });
        for (const entry of data?.attributeDataList ?? []) {
          attributeData.attributeDataList.push(entry);
        }
        startingHandle = data?.attributeDataList.at(-1)?.endGroupHandle ?? endingHandle;
      }
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code !== 'AttributeNotFound') {
        throw err;
      }
    }
    return attributeData.attributeDataList;
  }

  private async readByType(attributeType: Buffer, startingHandle: number, endingHandle: number): Promise<AttReadByTypeRspMsg['attributeDataList']> {
    const attributeData: AttReadByTypeRspMsg = { attributeDataList: [] };
    try {
      --startingHandle;
      while (startingHandle < endingHandle) {
        const data = await this.att.readByTypeReq({
          startingHandle: startingHandle + 1,
          endingHandle: endingHandle,
          attributeType,
        });
        for (const entry of data?.attributeDataList ?? []) {
          attributeData.attributeDataList.push(entry);
        }
        startingHandle = data?.attributeDataList.at(-1)?.handle ?? endingHandle;
      }
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code !== 'AttributeNotFound') {
        throw err;
      }
    }
    return attributeData.attributeDataList;
  }
}
