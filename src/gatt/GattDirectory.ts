import { GattService } from './GattService';
import { GattCharacteristic } from './GattCharacteristic';
import { GattDescriptor } from './GattDescriptor';

export interface DescriptorEntry {
  parent?: WeakRef<CharacteristicEntries>;
  descriptor: GattDescriptor;
}

export interface CharacteristicEntries {
  parent?: WeakRef<ServiceEntries>;
  characteristic: GattCharacteristic;
  descriptors: Record<string, DescriptorEntry | undefined>;
}

export interface ServiceEntries {
  parent?: WeakRef<ServiceEntries>;
  service: GattService;
  characteristics: Record<string, CharacteristicEntries | undefined>;
  services: Record<string, ServiceEntries | undefined>;
}

export interface Profile {
  services: Record<string, ServiceEntries | undefined>;
}

export class GattDirectory {
  private profile: Profile = { services: {} };

  private flatProfile: {
    services: Record<number, ServiceEntries | undefined>;
    characteristics: Record<number, CharacteristicEntries | undefined>;
    descriptors: Record<number, DescriptorEntry | undefined>;
  } = { services: {}, characteristics: {}, descriptors: {} };

  public get Profile() {
    // TODO: clone this
    return this.profile;
  }

  public saveServices(services: GattService[]): void {
    for (const service of services) {
      this.profile.services[service.UUID] = { service, characteristics: {}, services: {} };
      this.flatProfile.services[service.Handle] = this.profile.services[service.UUID];
    }
  }

  public saveIncludedServices(service: GattService, incServices: GattService[]): boolean {
    const profileService = this.flatProfile.services[service.Handle];
    if (!profileService) {
      return false;
    }
    for (const incService of incServices) {
      profileService.services[incService.UUID] = {
        parent: new WeakRef(profileService),
        service: incService, characteristics: {}, services: {},
      };
      this.flatProfile.services[incService.Handle] = profileService.services[incService.UUID];
    }
    return true;
  }

  public saveCharacteristics(service: GattService, characteristics: GattCharacteristic[]): boolean {
    const profileService = this.flatProfile.services[service.Handle];
    if (!profileService) {
      return false;
    }
    for (const characteristic of characteristics) {
      profileService.characteristics[characteristic.UUID] = {
        parent: new WeakRef(profileService), characteristic, descriptors: {},
      };
      this.flatProfile.characteristics[characteristic.Handle] = profileService.characteristics[characteristic.UUID];
    }
    return true;
  }

  public saveDescriptors(characteristic: GattCharacteristic, descriptors: GattDescriptor[]): boolean {
    const profileCharacteristic = this.flatProfile.characteristics[characteristic.Handle];
    if (!profileCharacteristic) {
      return false;
    }
    for (const descriptor of descriptors) {
      profileCharacteristic.descriptors[descriptor.UUID] = {
        parent: new WeakRef(profileCharacteristic),
        descriptor,
      };
      this.flatProfile.descriptors[descriptor.Handle] = profileCharacteristic.descriptors[descriptor.UUID];
    }
    return true;
  }

  public findServiceAndCharacteristicByCharacteristicHandle(attributeHandle: number) {
    const cEntry = this.flatProfile.characteristics[attributeHandle];
    if (!cEntry) { return null; }

    const sEntry = cEntry.parent?.deref();
    if (!sEntry) { return null; }

    return { service: sEntry.service, characteristic: cEntry.characteristic };
  }
}
