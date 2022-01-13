import { GattService } from './GattService';
import { GattCharacteristic } from './GattCharacteristic';
import { GattDescriptor } from './GattDescriptor';
import { UUID } from '../utils/UUID';

export interface DescriptorEntry {
  parent?: WeakRef<CharacteristicEntries>;
  descriptor: GattDescriptor;
}

export interface CharacteristicEntries {
  parent?: WeakRef<ServiceEntries>;
  characteristic: GattCharacteristic;
  descriptors: Record<number, DescriptorEntry | undefined>;
}

export namespace CharacteristicEntries {
  export interface AsObject {
    characteristic: GattCharacteristic.AsObject;
    descriptors: Record<number, GattDescriptor.AsObject>;
  }
}

export interface ServiceEntries {
  parent?: WeakRef<ServiceEntries>;
  service: GattService;
  characteristics: Record<number, CharacteristicEntries | undefined>;
  services: Record<number, ServiceEntries | undefined>;
}

export namespace ServiceEntries {
  export interface AsObject {
    service: GattService.AsObject;
    characteristics: Record<number, CharacteristicEntries.AsObject>;
    services: Record<number, ServiceEntries.AsObject>;
  }
}

export interface Profile {
  services: Record<number, ServiceEntries | undefined>;
}

export namespace Profile {
  export interface AsObject {
    services: Record<number, ServiceEntries.AsObject>;
  }
}

export class GattDirectory {
  private profile: Profile = { services: {} };

  private flatProfile: {
    services: Record<number, ServiceEntries | undefined>;
    characteristics: Record<number, CharacteristicEntries | undefined>;
    descriptors: Record<number, DescriptorEntry | undefined>;
  } = { services: {}, characteristics: {}, descriptors: {} };

  public get Profile() {
    return this.cloneProfile(this.profile);
  }

  public saveServices(services: GattService[]): void {
    for (const service of services) {
      this.profile.services[service.Handle] = { service, characteristics: {}, services: {} };
      this.flatProfile.services[service.Handle] = this.profile.services[service.Handle];
    }
  }

  public saveIncludedServices(service: GattService, incServices: GattService[]): boolean {
    const profileService = this.flatProfile.services[service.Handle];
    if (!profileService) {
      return false;
    }
    for (const incService of incServices) {
      profileService.services[incService.Handle] = {
        parent: new WeakRef(profileService),
        service: incService, characteristics: {}, services: {},
      };
      this.flatProfile.services[incService.Handle] = profileService.services[incService.Handle];
    }
    return true;
  }

  public saveCharacteristics(service: GattService, characteristics: GattCharacteristic[]): boolean {
    const profileService = this.flatProfile.services[service.Handle];
    if (!profileService) {
      return false;
    }
    for (const characteristic of characteristics) {
      profileService.characteristics[characteristic.Handle] = {
        parent: new WeakRef(profileService), characteristic, descriptors: {},
      };
      this.flatProfile.characteristics[characteristic.Handle] = profileService.characteristics[characteristic.Handle];
    }
    return true;
  }

  public saveDescriptors(characteristic: GattCharacteristic, descriptors: GattDescriptor[]): boolean {
    const profileCharacteristic = this.flatProfile.characteristics[characteristic.Handle];
    if (!profileCharacteristic) {
      return false;
    }
    for (const descriptor of descriptors) {
      profileCharacteristic.descriptors[descriptor.Handle] = {
        parent: new WeakRef(profileCharacteristic),
        descriptor,
      };
      this.flatProfile.descriptors[descriptor.Handle] = profileCharacteristic.descriptors[descriptor.Handle];
    }
    return true;
  }

  public findCharacteristic(charHandle: number): GattCharacteristic | null {
    const eChar = this.flatProfile.characteristics[charHandle];
    if (!eChar) { return null; }
    return eChar.characteristic;
  }

  public findDescriptor(charHandle: number, type: number): GattDescriptor | null {
    const eChar = this.flatProfile.characteristics[charHandle];
    if (!eChar) { return null; }
    for (const eDesc of Object.values(eChar.descriptors)) {
      if (!eDesc) { continue; }
      if (eDesc.descriptor.UUID === UUID.from(type).toString()) {
        return eDesc.descriptor;
      }
    }
    return null;
  }

  public findServiceAndCharacteristicByCharacteristicHandle(attributeHandle: number) {
    const cEntry = this.flatProfile.characteristics[attributeHandle];
    if (!cEntry) { return null; }

    const sEntry = cEntry.parent?.deref();
    if (!sEntry) { return null; }

    return { service: sEntry.service, characteristic: cEntry.characteristic };
  }

  private cloneProfile(profile: Profile): Profile.AsObject {
    const cloneCharacteristic = (e: CharacteristicEntries): CharacteristicEntries.AsObject => {
      const characteristic = e.characteristic.toObject();
      const descriptors: Record<string, GattDescriptor.AsObject> = {};
      for (const [k, v] of Object.entries(e.descriptors)) {
        if (!v) { continue; }
        descriptors[k] = v.descriptor.toObject();
      }
      return { characteristic, descriptors };
    };
    const cloneService = (e: ServiceEntries): ServiceEntries.AsObject => {
      const service = e.service.toObject();
      const characteristics: Record<string, CharacteristicEntries.AsObject> = {};
      for (const [k, v] of Object.entries(e.characteristics)) {
        if (!v) { continue; }
        characteristics[k] = cloneCharacteristic(v);
      }
      const services: Record<string, ServiceEntries.AsObject> = {};
      for (const [k, v] of Object.entries(e.services)) {
        if (!v) { continue; }
        services[k] = cloneService(v);
      }
      return { service, services, characteristics };
    };
    const services: Record<string, ServiceEntries.AsObject> = {};
    for (const [k, v] of Object.entries(profile.services)) {
      if (!v) { continue; }
      services[k] = cloneService(v);
    }
    return { services };
  }
}
