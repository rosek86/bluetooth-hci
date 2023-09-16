import { GattService } from './GattService';
import { GattCharacteristic } from './GattCharacteristic';
import { GattDescriptor } from './GattDescriptor';

// General concept:
// - GattDirectory is a tree of services, characteristics and descriptors
// - Each entry has a reference to its parent
// - Each entry has a reference to its children
// - Undefined means not yet discovered

export interface Service {
  service: GattService.AsObject;
  includedServices?: Record<number, IncludedService>;
  characteristics?: Record<number, Characteristic>;
}

export interface IncludedService {
  parent?: WeakRef<Service>;
  service: GattService.AsObject;
  includedServices?: Record<number, IncludedService>;
  characteristics?: Record<number, Characteristic>;
}

export interface Characteristic {
  parent?: WeakRef<Service | IncludedService>;
  characteristic: GattCharacteristic.AsObject;
  descriptors?: Record<number, Descriptor>;
}


export interface Descriptor {
  parent?: WeakRef<Characteristic>;
  descriptor: GattDescriptor.AsObject;
}

export interface Profile {
  services?: Record<number, Service>;
}

export const cloneProfile = (profile: Profile): Profile => {
  const cloneDescriptor = (e: Descriptor): Descriptor => {
    return { descriptor: structuredClone(e.descriptor) };
  };

  const cloneCharacteristic = (e: Characteristic): Characteristic => {
    const characteristic: Characteristic = { characteristic: structuredClone(e.characteristic) };

    for (const descriptor of Object.values(e.descriptors ?? {})) {
      if (characteristic.descriptors === undefined) {
        characteristic.descriptors = {};
      }
      characteristic.descriptors[descriptor.descriptor.handle] = cloneDescriptor(descriptor);
      characteristic.descriptors[descriptor.descriptor.handle].parent = new WeakRef(characteristic);
    }

    return characteristic;
  };

  const cloneService = (e: Service) => {
    const service: Service = { service: structuredClone(e.service) };

    for (const characteristic of Object.values(e.characteristics ?? {})) {
      if (service.characteristics === undefined) {
        service.characteristics = {};
      }
      service.characteristics[characteristic.characteristic.handle] = cloneCharacteristic(characteristic);
      service.characteristics[characteristic.characteristic.handle].parent = new WeakRef(service);
    }

    for (const includedService of Object.values(e.includedServices ?? {})) {
      if (service.includedServices === undefined) {
        service.includedServices = {};
      }
      service.includedServices[includedService.service.handle] = cloneService(includedService);
      service.includedServices[includedService.service.handle].parent = new WeakRef(service);
    }

    return service;
  };

  const p: Profile = {};
  for (const service of Object.values(profile.services ?? {})) {
    if (p.services === undefined) {
      p.services = {};
    }
    p.services[service.service.handle] = cloneService(service);
  }

  return p;
};

export class GattDirectory {
  private profile: Profile = {};

  private flatProfile: {
    services?: Record<number, Service>;
    includedServices?: Record<number, IncludedService>;
    characteristics?: Record<number, Characteristic>;
    descriptors?: Record<number, Descriptor>;
  } = {};

  public get Profile(): Profile {
    return cloneProfile(this.profile);
  }

  public getServices(): GattService.AsObject[] | undefined {
    if (!this.flatProfile.services) { return undefined; }
    return Object.values(this.flatProfile.services ?? [])
      .map((e) => e?.service)
      .filter((e): e is GattService.AsObject => !!e);
  }

  public saveServices(services: GattService[]): void {
    if (!this.profile.services) {
      this.profile.services = {};
    }
    if (!this.flatProfile.services) {
      this.flatProfile.services = {};
    }
    for (const service of services) {
      this.profile.services[service.Handle] = { service: service.toObject() };
      this.flatProfile.services[service.Handle] = this.profile.services[service.Handle];
    }
  }

  public getIncludedServices(handle: number): GattService.AsObject[] {
    const profileService = this.flatProfile.services?.[handle];
    if (!profileService) {
      return [];
    }
    return Object.values(profileService.includedServices ?? [])
      .map((e) => e?.service)
      .filter((e): e is GattService.AsObject => !!e);
  }

  public saveIncludedServices(handle: number, includedServices: GattService[]): boolean {
    const profileService = this.flatProfile.services?.[handle];
    if (!profileService) {
      return false;
    }
    if (!profileService.includedServices) {
      profileService.includedServices = {};
    }
    if (!this.flatProfile.includedServices) {
      this.flatProfile.includedServices = {};
    }
    for (const incService of includedServices) {
      profileService.includedServices[incService.Handle] = {
        parent: new WeakRef(profileService),
        service: incService.toObject(),
      };
      this.flatProfile.includedServices[incService.Handle] = profileService.includedServices[incService.Handle];
    }
    return true;
  }

  public getCharacteristics(handle: number): GattCharacteristic.AsObject[] | undefined {
    const profileService = this.flatProfile.services?.[handle] ?? this.flatProfile.includedServices?.[handle];
    if (!profileService) {
      return undefined
    }
    if (!profileService.characteristics) {
      return undefined;
    }
    return Object.values(profileService.characteristics ?? [])
      .map((e) => e?.characteristic)
      .filter((e): e is GattCharacteristic.AsObject => !!e);
  }

  public saveCharacteristics(handle: number, characteristics: GattCharacteristic[]): boolean {
    const profileService = this.flatProfile.services?.[handle] ?? this.flatProfile.includedServices?.[handle];
    if (!profileService) {
      return false;
    }
    if (!profileService.characteristics) {
      profileService.characteristics = {};
    }
    if (!this.flatProfile.characteristics) {
      this.flatProfile.characteristics = {};
    }
    for (const characteristic of characteristics) {
      profileService.characteristics[characteristic.Handle] = {
        parent: new WeakRef(profileService),
        characteristic: characteristic.toObject(),
      };
      this.flatProfile.characteristics[characteristic.Handle] = profileService.characteristics[characteristic.Handle];
    }
    return true;
  }

  public getDescriptors(handle: number): GattDescriptor.AsObject[] | undefined {
    const profileCharacteristic = this.flatProfile.characteristics?.[handle];
    if (!profileCharacteristic) {
      return undefined;
    }
    if (!profileCharacteristic.descriptors) {
      return undefined;
    }
    return Object.values(profileCharacteristic.descriptors)
      .map((e) => e?.descriptor)
      .filter((e): e is GattDescriptor.AsObject => !!e);
  }

  public saveDescriptors(handle: number, descriptors: GattDescriptor[]): boolean {
    const profileCharacteristic = this.flatProfile.characteristics?.[handle];
    if (!profileCharacteristic) {
      return false;
    }
    if (!profileCharacteristic.descriptors) {
      profileCharacteristic.descriptors = {};
    }
    if (!this.flatProfile.descriptors) {
      this.flatProfile.descriptors = {};
    }
    for (const descriptor of descriptors) {
      profileCharacteristic.descriptors[descriptor.Handle] = {
        parent: new WeakRef(profileCharacteristic),
        descriptor: descriptor.toObject(),
      };
      this.flatProfile.descriptors[descriptor.Handle] = profileCharacteristic.descriptors[descriptor.Handle];
    }
    return true;
  }

  public findCharacteristic(handle: number): GattCharacteristic.AsObject | null {
    const eChar = this.flatProfile.characteristics?.[handle];
    if (!eChar) { return null; }
    return eChar.characteristic;
  }

  public findDescriptor(charHandle: number, type: number): GattDescriptor.AsObject | null {
    const char = this.flatProfile.characteristics?.[charHandle];
    if (!char || !char.descriptors) { return null; }
    for (const desc of Object.values(char.descriptors)) {
      if (!desc) { continue; }
      if (desc.descriptor.uuid16 === type) {
        return desc.descriptor;
      }
    }
    return null;
  }

  public findByDescriptorHandle(handle: number) {
    const dEntry = this.flatProfile.descriptors?.[handle];
    if (!dEntry) { return null; }

    const cEntry = dEntry.parent?.deref();
    if (!cEntry) { return null; }

    const sEntry = cEntry.parent?.deref();
    if (!sEntry) { return null; }

    return { service: sEntry.service, characteristic: cEntry.characteristic, descriptor: dEntry.descriptor };
  }
}
