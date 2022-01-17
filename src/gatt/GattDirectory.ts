import { GattService } from './GattService';
import { GattCharacteristic } from './GattCharacteristic';
import { GattDescriptor } from './GattDescriptor';
import { UUID } from '../utils/UUID';


export namespace Descriptor {
  export interface Entry {
    parent?: WeakRef<Characteristic.Entries>;
    descriptor: GattDescriptor;
  }
}

export namespace Characteristic {
  export interface Entries {
    parent?: WeakRef<Service.Entries>;
    characteristic: GattCharacteristic;
    descriptors: Record<number, Descriptor.Entry | undefined>;
  }

  export interface AsObject {
    characteristic: GattCharacteristic.AsObject;
    descriptors: GattDescriptor.AsObject[];
  }
}

export namespace Service {
  export interface Entries {
    parent?: WeakRef<Service.Entries>;
    service: GattService;
    characteristics: Record<number, Characteristic.Entries | undefined>;
    services: Record<number, Service.Entries | undefined>;
  }

  export interface AsObject {
    service: GattService.AsObject;
    characteristics: Characteristic.AsObject[];
    services: Service.AsObject[];
  }
}

export namespace Profile {
  export interface Entries {
    services: Record<number, Service.Entries | undefined>;
  }

  export interface AsObject {
    services: Service.AsObject[];
  }

  export const clone = (profile: Profile.Entries): Profile.AsObject => {
    const cloneCharacteristic = (e: Characteristic.Entries): Characteristic.AsObject => {
      const characteristic = e.characteristic.toObject();
      const descriptors: GattDescriptor.AsObject[] = [];
      for (const v of Object.values(e.descriptors)) {
        if (!v) { continue; }
        descriptors.push(v.descriptor.toObject());
      }
      return { characteristic, descriptors };
    };
    const cloneService = (e: Service.Entries): Service.AsObject => {
      const service = e.service.toObject();
      const characteristics: Characteristic.AsObject[] = [];
      for (const v of Object.values(e.characteristics)) {
        if (!v) { continue; }
        characteristics.push(cloneCharacteristic(v));
      }
      const services: Service.AsObject[] = [];
      for (const v of Object.values(e.services)) {
        if (!v) { continue; }
        services.push(cloneService(v));
      }
      return { service, services, characteristics };
    };
    const services: Service.AsObject[] = [];
    for (const v of Object.values(profile.services)) {
      if (!v) { continue; }
      services.push(cloneService(v));
    }
    return { services };
  };
}

export class GattDirectory {
  private profile: Profile.Entries = { services: {} };

  private flatProfile: {
    services: Record<number, Service.Entries | undefined>;
    characteristics: Record<number, Characteristic.Entries | undefined>;
    descriptors: Record<number, Descriptor.Entry | undefined>;
  } = { services: {}, characteristics: {}, descriptors: {} };

  public get Profile(): Profile.AsObject {
    return Profile.clone(this.profile);
  }

  public saveServices(services: GattService[]): void {
    for (const service of services) {
      this.profile.services[service.Handle] = { service, characteristics: {}, services: {} };
      this.flatProfile.services[service.Handle] = this.profile.services[service.Handle];
    }
  }

  public saveIncludedServices(handle: number, incServices: GattService[]): boolean {
    const profileService = this.flatProfile.services[handle];
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

  public saveCharacteristics(handle: number, characteristics: GattCharacteristic[]): boolean {
    const profileService = this.flatProfile.services[handle];
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

  public saveDescriptors(handle: number, descriptors: GattDescriptor[]): boolean {
    const profileCharacteristic = this.flatProfile.characteristics[handle];
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

  public findCharacteristic(handle: number): GattCharacteristic | null {
    const eChar = this.flatProfile.characteristics[handle];
    if (!eChar) { return null; }
    return eChar.characteristic;
  }

  public findDescriptor(handle: number, type: number): GattDescriptor | null {
    const eChar = this.flatProfile.characteristics[handle];
    if (!eChar) { return null; }
    for (const eDesc of Object.values(eChar.descriptors)) {
      if (!eDesc) { continue; }
      if (eDesc.descriptor.UUID === UUID.from(type).toString()) {
        return eDesc.descriptor;
      }
    }
    return null;
  }

  public findByDescriptorHandle(handle: number) {
    const dEntry = this.flatProfile.descriptors[handle];
    if (!dEntry) { return null; }

    const cEntry = dEntry.parent?.deref();
    if (!cEntry) { return null; }

    const sEntry = cEntry.parent?.deref();
    if (!sEntry) { return null; }

    return { service: sEntry.service, characteristic: cEntry.characteristic, descriptor: dEntry.descriptor };
  }
}
