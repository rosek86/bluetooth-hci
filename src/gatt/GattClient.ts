import Debug from 'debug';
import { EventEmitter } from 'events';

import { Att, AttDataEntry } from './AttGlue';
import { GattService } from './GattService';
import { GattCharacteristic } from './GattCharacteristic';
import { GattDescriptor } from './GattDescriptor';
import { Profile, GattDirectory } from './GattDirectory';

import { UUID } from '../utils/UUID';
import { AttHandleValueIndMsg, AttHandleValueNtfMsg } from '../att/AttSerDes';

const debug = Debug('bt-hci-gatt');

export enum  GattProfileAttributeType {
  PrimaryService                    = 0x2800, // Primary Service Declaration
  SecondaryService                  = 0x2801, // Secondary Service Declaration
  Include                           = 0x2802, // Include Declaration
  Characteristic                    = 0x2803, // Characteristic Declaration
  CharacteristicExtendedProperties  = 0x2900, // Characteristic Extended Properties
  CharacteristicUserDescription     = 0x2901, // Characteristic User Description Descriptor
  ClientCharacteristicConfiguration = 0x2902, // Client Characteristic Configuration Descriptor
  ServerCharacteristicConfiguration = 0x2903, // Server Characteristic Configuration Descriptor
  CharacteristicPresentationFormat  = 0x2904, // Characteristic Presentation Format Descriptor
  CharacteristicAggregateFormat     = 0x2905, // Characteristic Aggregate Format Descriptor
}

interface GattHvxParams {
  service: GattService.AsObject;
  characteristic: GattCharacteristic.AsObject;
  descriptor: GattDescriptor.AsObject;
  attributeValue: Buffer;
}

export interface GattClient {
  on(event: 'GattNotification', listener: (event: GattHvxParams) => void): this;
  once(event: 'GattNotification', listener: (event: GattHvxParams) => void): this;
  removeListener(event: 'GattNotification', listener: (event: GattHvxParams) => void): this;

  on(event: 'GattIndication', listener: (event: GattHvxParams) => void): this;
  once(event: 'GattIndication', listener: (event: GattHvxParams) => void): this;
  removeListener(event: 'GattIndication', listener: (event: GattHvxParams) => void): this;
}

export class GattClient extends EventEmitter {
  private mtu = 23;
  private directory: GattDirectory;

  public get Profile() {
    return this.directory.Profile;
  }

  constructor(private att: Att, profile?: Profile) {
    super();
    this.directory = new GattDirectory(profile);
    att.on('Disconnected', this.onDisconnected);
    att.on('HandleValueInd', this.onValueIndication);
    att.on('HandleValueNtf', this.onValueNotification);
  }

  private destroy(): void {
    this.att.off('Disconnected', this.onDisconnected);
    this.att.off('HandleValueInd', this.onValueIndication);
    this.att.off('handleValueNtf', this.onValueNotification);
    this.removeAllListeners();
  }

  private onDisconnected = (): void => this.destroy();

  private onValueIndication = async (msg: AttHandleValueIndMsg): Promise<void> => {
    await this.att.handleValueCfm();
    const entry = this.directory?.findByDescriptorHandle(msg.attributeHandle);
    if (!entry) {
      return;
    }
    this.emit('GattIndication', {
      service: entry.service,
      characteristic: entry.characteristic,
      descriptor: entry.descriptor,
      attributeValue: msg.attributeValue,
    });
  };

  private onValueNotification = (msg: AttHandleValueNtfMsg): void => {
    const entry = this.directory?.findByDescriptorHandle(msg.attributeHandle);
    if (!entry) {
      return;
    }
    this.emit('GattNotification', {
      service: entry.service,
      characteristic: entry.characteristic,
      descriptor: entry.descriptor,
      attributeValue: msg.attributeValue,
    });
  };

  public async discover(): Promise<Profile> {
    const services = await this.discoverServices();
    for (const service of services) {
      debug('service', service);

      const includedServices = await this.discoverIncludedServices(service);
      for (const includedService of includedServices) {
        debug('inc-service', includedService);
      }

      const characteristics = await this.discoverCharacteristics(service);
      for (const characteristic of characteristics) {
        debug('characteristic', characteristic);

        const descriptors = await this.discoverDescriptors(characteristic);

        for (const descriptor of descriptors) {
          debug('descriptor', descriptor);
        }
      }
    }

    const profile = this.directory.Profile;
    this.emit('GattDiscovery', { profile });
    return profile;
  }

  public async discoverServices(): Promise<GattService.AsObject[]> {
    const cacheServices = this.directory.getServices();
    if (cacheServices !== undefined) {
      return cacheServices;
    }
    const type = GattProfileAttributeType.PrimaryService;
    const entries = await this.readByGroupTypeReqBetween(type, 1, 0xFFFF);
    const services = entries.map((e) => GattService.fromAttData(e).toObject());
    this.directory.saveServices(services);
    return services;
  }

  public async discoverIncludedServices(service: GattService.AsObject): Promise<GattService.AsObject[]> {
    const cacheIncludedServices = this.directory.getIncludedServices(service.handle);
    if (cacheIncludedServices !== undefined) {
      return cacheIncludedServices;
    }
    const type = GattProfileAttributeType.Include;
    const entries = await this.readByTypeBetween(type, service.handle, service.endingHandle);
    const includedServices = entries.map((e) => GattService.fromAttData(e).toObject());
    this.directory.saveIncludedServices(service.handle, includedServices);
    return includedServices;
  }

  public async discoverCharacteristics(service: GattService.AsObject): Promise<GattCharacteristic.AsObject[]> {
    const cacheCharacteristics = this.directory.getCharacteristics(service.handle);
    if (cacheCharacteristics !== undefined) {
      return cacheCharacteristics;
    }
    const type = GattProfileAttributeType.Characteristic;
    const entries = await this.readByTypeBetween(type, service.handle, service.endingHandle);
    const characteristics = entries.map((e) => GattCharacteristic.fromAttData(e).toObject());
    this.directory.saveCharacteristics(service.handle, characteristics);
    return characteristics;
  }

  public async discoverDescriptors(characteristic: GattCharacteristic.AsObject): Promise<GattDescriptor.AsObject[]> {
    const cacheDescriptors = this.directory.getDescriptors(characteristic.handle);
    if (cacheDescriptors !== undefined) {
      return cacheDescriptors;
    }
    const entries = await this.findInformationBetween(characteristic.handle, characteristic.endingHandle);
    const descriptors = entries.map((e) => GattDescriptor.fromAttData(e).toObject());
    this.directory.saveDescriptors(characteristic.handle, descriptors);
    return descriptors;
  }

  public async exchangeMtu(mtu: number): Promise<number> {
    const result = await this.att.exchangeMtuReq({ mtu });
    this.mtu = result.mtu;
    return result.mtu;
  }

  public findCharacteristicByUuids(uuids: { serviceUuid: string; characteristicUuid: string }): GattCharacteristic.AsObject | null {
    return this.directory.findCharacteristicByUuids(uuids);
  }

  public findDescriptorByUuid(uuids: { serviceUuid: string; descriptorUuid: string }): GattDescriptor.AsObject | null {
    return this.directory.findDescriptorByUuids(uuids);
  }

  public async read(char: GattCharacteristic.AsObject): Promise<Buffer> {
    const handle = char.valueHandle;
    const blob = await this.att.readReq({ attributeHandle: handle });

    let part = blob.attributeValue;
    let value = Buffer.concat([ part ]);

    while (part.length === (this.mtu - 1)) {
      const blob = await this.att.readBlobReq({
        attributeHandle: handle,
        valueOffset: value.length,
      });

      part = blob.partAttributeValue;
      value = Buffer.concat([ value, part ]);
    }

    return value;
  }

  public async write(char: GattCharacteristic.AsObject, value: Buffer): Promise<void> {
    const handle = char.valueHandle;
    await this.att.writeReq({ attributeHandle: handle, attributeValue: value });
  }

  public async writeWithoutResponse(char: GattCharacteristic.AsObject, value: Buffer): Promise<void> {
    const handle = char.valueHandle;
    await this.att.writeCmd({ attributeHandle: handle, attributeValue: value });
  }

  public async startCharacteristicsNotifications(char: GattCharacteristic.AsObject, requireAck: boolean) {
    if (!requireAck && !char.properties.notify ||
         requireAck && !char.properties.indicate) {
      throw new Error('Cannot start notification on characteristic');
    }

    const attributeHandle = await this.getCCCDescriptorHandle(char);
    if (!attributeHandle) {
      throw new Error('CCCD not found');
    }

    const enableNotificationBitfield = requireAck ? 2 : 1;
    const attributeValue = Buffer.alloc(2);
    attributeValue.writeUInt16LE(enableNotificationBitfield);

    await this.att.writeReq({ attributeHandle, attributeValue });
  }

  public async stopCharacteristicsNotifications(char: GattCharacteristic.AsObject) {
    const attributeHandle = await this.getCCCDescriptorHandle(char);
    if (!attributeHandle) {
      throw new Error('CCCD not found');
    }

    const attributeValue = Buffer.alloc(0);
    await this.att.writeReq({ attributeHandle, attributeValue });
  }

  private getCCCDescriptorHandle(char: GattCharacteristic.AsObject): number | null {
    return this.directory.findDescriptor(
      char.handle,
      GattProfileAttributeType.ClientCharacteristicConfiguration
    )?.handle ?? null;
  }

  private async readByGroupTypeReqBetween(attributeGroupType: number, startingHandle: number, endingHandle: number): Promise<AttDataEntry[]> {
    const attributeData: AttDataEntry[] = [];
    try {
      --startingHandle;
      while (startingHandle < endingHandle) {
        const data = await this.readByGroupType(attributeGroupType, startingHandle + 1, endingHandle);

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

  private async readByGroupType(attributeGroupType: number, startingHandle: number, endingHandle: number) {
    return await this.att.readByGroupTypeReq({
      attributeGroupType: UUID.from(attributeGroupType, 2),
      startingHandle, endingHandle,
    });
  }

  private async readByTypeBetween(attributeType: number, startingHandle: number, endingHandle: number): Promise<AttDataEntry[]> {
    const attributeData: AttDataEntry[] = [];
    try {
      --startingHandle;
      while (startingHandle < endingHandle) {
        const data = await this.readByTypeReq(attributeType, startingHandle + 1, endingHandle);

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

  private async readByTypeReq(attributeType: number, startingHandle: number, endingHandle: number) {
    return await this.att.readByTypeReq({
      attributeType: UUID.from(attributeType, 2),
      startingHandle, endingHandle,
    });
  }

  private async findInformationBetween(startingHandle: number, endingHandle: number): Promise<AttDataEntry[]> {
    const attributeData: AttDataEntry[] = [];
    try {
      --startingHandle;
      while (startingHandle < endingHandle) {
        const data = await this.att.findInformationReq({
          startingHandle: startingHandle + 1, endingHandle,
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
