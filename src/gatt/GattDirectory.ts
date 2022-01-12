
import { GattService } from './GattService';
import { GattCharacteristic } from './GattCharacteristic';
import { GattDescriptor } from './GattDescriptor';

export interface DescriptorEntry {
  parent: WeakRef<CharacteristicEntries>;
  descriptor: GattDescriptor;
}

export interface CharacteristicEntries {
  parent: WeakRef<ServiceEntries>;
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

  public get Profile() { return this.profile; }
  public get FlatProfile() { return this.flatProfile; }

  public saveServices(services: GattService[]): void {
    for (const service of services) {
      this.profile.services[service.UUID] = { service, characteristics: {}, services: {} };
      this.flatProfile.services[service.Handle] = this.profile.services[service.UUID];
    }
  }

  public saveIncludedServices(service: ServiceEntries, incServices: GattService[]): void {
    for (const incService of incServices) {
      service.services[incService.UUID] = {
        parent: new WeakRef(service), service: incService, characteristics: {}, services: {},
      };
      this.flatProfile.services[incService.Handle] = service.services[incService.UUID];
    }
  }

  public saveCharacteristics(service: ServiceEntries, characteristics: GattCharacteristic[]): void {
    for (const characteristic of characteristics) {
      service.characteristics[characteristic.UUID] = {
        parent: new WeakRef(service), characteristic, descriptors: {},
      };
      this.flatProfile.characteristics[characteristic.Handle] = service.characteristics[characteristic.UUID];
    }
  }

  public saveDescriptors(characteristic: CharacteristicEntries, descriptors: GattDescriptor[]) {
    for (const descriptor of descriptors) {
      characteristic.descriptors[descriptor.UUID] = { parent: new WeakRef(characteristic), descriptor };
      this.flatProfile.descriptors[descriptor.Handle] = characteristic.descriptors[descriptor.UUID];
    }
  }

  public findServiceAndCharacteristicByCharacteristicHandle(attributeHandle: number) {
    const cEntry = this.flatProfile.characteristics[attributeHandle];
    if (!cEntry) { return null; }

    const sEntry = cEntry.parent.deref();
    if (!sEntry) { return null; }

    return { service: sEntry.service, characteristic: cEntry.characteristic };
  }
}
