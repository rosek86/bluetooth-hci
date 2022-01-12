import Debug from 'debug';
import { EventEmitter } from 'stream';

import { Att, AttDataEntry } from './AttGlue';
import { GattService } from './GattService';
import { GattCharacteristic } from './GattCharacteristic';
import { GattDescriptor } from './GattDescriptor';
import { AttHandleValueIndMsg, AttHandleValueNtfMsg } from '../att/AttSerDes';
import { HciError } from '../hci/HciError';

const debug = Debug('nble-gatt');

interface CharacteristicEntries {
  characteristic: GattCharacteristic;
  descriptors: { [uuid: string]: GattDescriptor };
}

interface ServiceEntries {
  service: GattService;
  characteristics: { [uuid: string]: CharacteristicEntries };
  services: { [uuid: string]: ServiceEntries };
}

interface Profile {
  services: { [uuid: string]: ServiceEntries };
}

export class Gatt extends EventEmitter {
  private readonly GATT_PRIM_SVC_UUID = Buffer.from([0x00, 0x28]);
  private readonly GATT_INCLUDE_UUID = Buffer.from([0x02, 0x28]);
  private readonly GATT_CHARAC_UUID = Buffer.from([0x03, 0x28]);

  private profile: Profile = { services: {} };

  public get Profile() {
    // TODO: deep clone
    return this.profile;
  }

  private mtu = 23;

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

  private onDisconnected = (_: HciError) => {
    this.destroy();
  };

  private onValueIndication = async (msg: AttHandleValueIndMsg) => {
    // msg.attributeHandle
    // msg.attributeValue
    await this.att.handleValueCfm();
  };

  private onValueNotification = (msg: AttHandleValueNtfMsg) => {
    // msg.attributeHandle
    // msg.attributeValue
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
    return this.Profile;
  }

  public async discoverServices(): Promise<GattService[]> {
    const entries = await this.readByGroupTypeReq(this.GATT_PRIM_SVC_UUID, 1, 0xFFFF);
    const services = entries.map((e) => GattService.fromAttData(e));
    for (const service of services) {
      this.saveService(service);
    }
    return services;
  }

  public async discoverIncludedServices(service: GattService): Promise<GattService[]> {
    const entries = await this.readByType(this.GATT_INCLUDE_UUID, service.Handle, service.EndingHandle);
    const includedServices = entries.map((e) => GattService.fromAttData(e));
    if (this.profile.services[service.UUID]) {
      for (const includedService of includedServices) {
        this.saveIncludedService(this.profile.services[service.UUID], includedService);
      }
    }
    return includedServices;
  }

  public async discoverCharacteristics(service: GattService): Promise<GattCharacteristic[]> {
    const entries = await this.readByType(this.GATT_CHARAC_UUID, service.Handle+1, service.EndingHandle);
    const characteristics = entries.map((e) => GattCharacteristic.fromAttData(e));
    if (this.profile.services[service.UUID]) {
      for (const characteristic of characteristics) {
        this.saveCharacteristic(this.profile.services[service.UUID], characteristic);
      }
    }
    return characteristics;
  }

  public async discoverDescriptors(characteristic: GattCharacteristic): Promise<GattDescriptor[]> {
    const entries = await this.findInformation(characteristic.Handle+1, characteristic.EndingHandle);
    const descriptors = entries.map((e) => GattDescriptor.fromAttData(e));
    const service = this.findServiceForCharacteristic(characteristic);
    if (service) {
      for (const descriptor of descriptors) {
        this.saveDescriptor(service.characteristics[characteristic.UUID], descriptor);
      }
    }
    return descriptors;
  }

  private findServiceForCharacteristic(characteristic: GattCharacteristic): ServiceEntries | null {
    for (const service of Object.values(this.profile.services)) {
      if (service.characteristics[characteristic.UUID]) {
        return service;
      }
    }
    return null;
  }

  private saveService(service: GattService): void {
    this.profile.services[service.UUID] = { service, characteristics: {}, services: {} };
  }

  private saveIncludedService(services: ServiceEntries, service: GattService): void {
    services.services[service.UUID] = { service, characteristics: {}, services: {} };
  }

  private saveCharacteristic(services: ServiceEntries, characteristic: GattCharacteristic): void {
    services.characteristics[characteristic.UUID] = { characteristic, descriptors: {} };
  }

  private saveDescriptor(characteristic: CharacteristicEntries, descriptor: GattDescriptor): void {
    characteristic.descriptors[descriptor.UUID] = descriptor;
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
