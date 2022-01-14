import Debug from 'debug';
import { EventEmitter } from 'events';

import { Att, AttDataEntry } from './AttGlue';
import { GattService } from './GattService';
import { GattCharacteristic } from './GattCharacteristic';
import { GattDescriptor } from './GattDescriptor';
import { Profile, GattDirectory } from './GattDirectory';

import { UUID } from '../utils/UUID';
import { HciError } from '../hci/HciError';
import {AttHandleValueIndMsg, AttHandleValueNtfMsg } from '../att/AttSerDes';

const debug = Debug('nble-gatt');

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

export class Gatt extends EventEmitter {
  private mtu = 23;
  private directory = new GattDirectory();

  public get Profile() {
    return this.directory.Profile;
  }

  constructor(private att: Att) {
    super();
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

  private onDisconnected = (_: HciError): void => this.destroy();

  private onValueIndication = async (msg: AttHandleValueIndMsg): Promise<void> => {
    await this.att.handleValueCfm();
    const entry = this.directory.findServiceAndCharacteristicByCharacteristicHandle(msg.attributeHandle);
    if (!entry) {
      return;
    }
    this.emit('GattIndication', entry.service.UUID, entry.characteristic.UUID, msg.attributeValue);
  };

  private onValueNotification = (msg: AttHandleValueNtfMsg): void => {
    const entry = this.directory.findServiceAndCharacteristicByCharacteristicHandle(msg.attributeHandle);
    if (!entry) {
      return;
    }
    this.emit('GattNotification', entry.service.UUID, entry.characteristic.UUID, msg.attributeValue);
  };

  public async discover(): Promise<Profile.AsObject> {
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
    return this.Profile;
  }

  public async discoverServices(): Promise<GattService[]> {
    const type = UUID.from(GattProfileAttributeType.PrimaryService, 2);
    const entries = await this.readByGroupTypeReq(type, 1, 0xFFFF);
    const services = entries.map((e) => GattService.fromAttData(e));
    this.directory.saveServices(services);
    return services;
  }

  public async discoverIncludedServices(service: GattService): Promise<GattService[]> {
    const type = UUID.from(GattProfileAttributeType.Include, 2);
    const entries = await this.readByType(type, service.Handle, service.EndingHandle);
    const includedServices = entries.map((e) => GattService.fromAttData(e));
    this.directory.saveIncludedServices(service, includedServices);
    return includedServices;
  }

  public async discoverCharacteristics(service: GattService): Promise<GattCharacteristic[]> {
    const type = UUID.from(GattProfileAttributeType.Characteristic, 2);
    const entries = await this.readByType(type, service.Handle+1, service.EndingHandle);
    const characteristics = entries.map((e) => GattCharacteristic.fromAttData(e));
    this.directory.saveCharacteristics(service, characteristics);
    return characteristics;
  }

  public async discoverDescriptors(characteristic: GattCharacteristic): Promise<GattDescriptor[]> {
    const entries = await this.findInformation(characteristic.Handle+1, characteristic.EndingHandle);
    const descriptors = entries.map((e) => GattDescriptor.fromAttData(e));
    this.directory.saveDescriptors(characteristic, descriptors);
    return descriptors;
  }

  public async exchangeMtu(mtu: number): Promise<number> {
    const result = await this.att.exchangeMtuReq({ mtu });
    this.mtu = result.mtu;
    return result.mtu;
  }

  public async read(handle: number): Promise<Buffer> {
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

  public async write(handle: number, value: Buffer): Promise<void> {
    await this.att.writeReq({ attributeHandle: handle, attributeValue: value });
  }

  public async writeWithoutResponse(handle: number, value: Buffer): Promise<void> {
    await this.att.writeCmd({ attributeHandle: handle, attributeValue: value });
  }

  public async notify(charHandle: number, enable: boolean) {
    const char = this.directory.findCharacteristic(charHandle);
    if (!char) {
      return;
    }

    const attributeType = UUID.from(
      GattProfileAttributeType.ClientCharacteristicConfiguration, 2
    );

    const data = await this.att.readByTypeReq({
      startingHandle: char.Handle + 1,
      endingHandle: char.EndingHandle,
      attributeType,
    });
    const attributeData = data.attributeDataList[0];
    let attributeValue = attributeData.value.readUInt16LE(0);

    let mask = 0;
    if (char.Properties.notify) {
      mask = 1;
    } else if (char.Properties.indicate) {
      mask = 2;
    } else {
      throw new Error('');
    }

    if (enable) {
      attributeValue |= mask;
    } else {
      attributeValue &= ~mask;
    }

    const out = Buffer.alloc(2);
    out.writeUInt16LE(attributeValue);

    await this.att.writeReq({
      attributeHandle: attributeData.handle,
      attributeValue: out,
    });
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
      --startingHandle;
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
