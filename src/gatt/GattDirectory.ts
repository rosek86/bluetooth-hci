import { GattService } from './GattService';
import { GattCharacteristic } from './GattCharacteristic';
import { GattDescriptor } from './GattDescriptor';

// General concept:
// - GattDirectory is a tree of services, characteristics and descriptors
// - Each entry has a reference to its parent
// - Each entry has a reference to its children
// - Undefined means not yet discovered

export interface Profile {
  services?: Record<number, Service>;
}

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

export interface FlatProfile  {
  services?: Record<number, Service>;
  includedServices?: Record<number, IncludedService>;
  characteristics?: Record<number, Characteristic>;
  descriptors?: Record<number, Descriptor>;
}

export class GattDirectory {
  private profile: Profile = {};
  private flatProfile: FlatProfile = {};

  public get Profile(): Profile {
    return this.cloneProfile(this.profile);
  }

  public constructor(profile?: Profile) {
    if (!profile) {
      return;
    }
    const fillDescriptor = (e: Descriptor, fp: FlatProfile) => {
      if (fp.descriptors === undefined) { fp.descriptors = {}; }
      fp.descriptors[e.descriptor.handle] = e;
    };
    const fillCharacteristic = (e: Characteristic, fp: FlatProfile) => {
      if (fp.characteristics === undefined) { fp.characteristics = {}; }
      fp.characteristics[e.characteristic.handle] = e;
      if (e.descriptors !== undefined) {
        for (const descriptor of Object.values(e.descriptors)) {
          fillDescriptor(descriptor, fp);
        }
      }
    };
    const fillIncludedService = (e: IncludedService, fp: FlatProfile) => {
      if (fp.includedServices === undefined) { fp.includedServices = {}; }
      fp.includedServices[e.service.handle] = e;
      if (e.characteristics !== undefined) {
        for (const characteristic of Object.values(e.characteristics)) {
          fillCharacteristic(characteristic, fp);
        }
      }
      if (e.includedServices !== undefined) {
        for (const includedService of Object.values(e.includedServices)) {
          fillIncludedService(includedService, fp);
        }
      }
    }
    const fillService = (e: Service, fp: FlatProfile) => {
      if (fp.services === undefined) { fp.services = {}; }
      fp.services[e.service.handle] = e;
      if (e.characteristics !== undefined) {
        for (const characteristic of Object.values(e.characteristics)) {
          fillCharacteristic(characteristic, fp);
        }
      }
      if (e.includedServices !== undefined) {
        for (const includedService of Object.values(e.includedServices)) {
          fillIncludedService(includedService, fp);
        }
      }
    };
    const fillFlatProfile = (p: Profile, fp: FlatProfile): FlatProfile => {
      if (p.services !== undefined) {
        for (const service of Object.values(p.services)) {
          fillService(service, fp);
        }
      }
      return fp;
    };
    this.profile = this.cloneProfile(profile);
    this.flatProfile = fillFlatProfile(this.profile, {});
  }

  private cloneProfile(profile: Profile): Profile {
    const cloneDescriptor = (e: Descriptor): Descriptor => {
      return { descriptor: structuredClone(e.descriptor) };
    };
    const cloneCharacteristic = (e: Characteristic): Characteristic => {
      const characteristic: Characteristic = { characteristic: structuredClone(e.characteristic) };

      if (e.descriptors !== undefined) {
        characteristic.descriptors = {};
        for (const descriptor of Object.values(e.descriptors)) {
          characteristic.descriptors[descriptor.descriptor.handle] = cloneDescriptor(descriptor);
          characteristic.descriptors[descriptor.descriptor.handle].parent = new WeakRef(characteristic);
        }
      }

      return characteristic;
    };
    const cloneService = (e: Service) => {
      const service: Service = { service: structuredClone(e.service) };

      if (e.characteristics !== undefined) {
        service.characteristics = {};
        for (const characteristic of Object.values(e.characteristics)) {
          service.characteristics[characteristic.characteristic.handle] = cloneCharacteristic(characteristic);
          service.characteristics[characteristic.characteristic.handle].parent = new WeakRef(service);
        }
      }

      if (e.includedServices !== undefined) {
        service.includedServices = {};
        for (const includedService of Object.values(e.includedServices)) {
          service.includedServices[includedService.service.handle] = cloneService(includedService);
          service.includedServices[includedService.service.handle].parent = new WeakRef(service);
        }
      }

      return service;
    };
    const cloneProfile = (p: Profile): Profile => {
      const profile: Profile = {};

      if (p.services !== undefined) {
        profile.services = {};
        for (const service of Object.values(p.services)) {
          profile.services[service.service.handle] = cloneService(service);
        }
      }

      return profile;
    };
    return cloneProfile(profile);
  }

  public getServices(): GattService.AsObject[] | undefined {
    if (!this.profile.services) {
      return undefined;
    }
    return Object.values(this.flatProfile.services ?? {}).map((e) => e.service);
  }

  public saveServices(services: GattService.AsObject[]): void {
    if (!this.profile.services) {
      this.profile.services = {};
    }
    if (!this.flatProfile.services) {
      this.flatProfile.services = {};
    }
    for (const service of services) {
      this.profile.services[service.handle] = { service: service };
      this.flatProfile.services[service.handle] = this.profile.services[service.handle];
    }
  }

  public getIncludedServices(handle: number): GattService.AsObject[] | undefined {
    const profileService = this.flatProfile.services?.[handle];
    if (!profileService) {
      return undefined;
    }
    if (!profileService.includedServices) {
      return undefined;
    }
    return Object.values(profileService.includedServices ?? {}).map((e) => e.service);
  }

  public saveIncludedServices(handle: number, includedServices: GattService.AsObject[]): boolean {
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
    for (const includedService of includedServices) {
      profileService.includedServices[includedService.handle] = { parent: new WeakRef(profileService), service: includedService };
      this.flatProfile.includedServices[includedService.handle] = profileService.includedServices[includedService.handle];
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
    return Object.values(profileService.characteristics ?? {}).map((e) => e.characteristic);
  }

  public saveCharacteristics(handle: number, characteristics: GattCharacteristic.AsObject[]): boolean {
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
      profileService.characteristics[characteristic.handle] = { parent: new WeakRef(profileService), characteristic };
      this.flatProfile.characteristics[characteristic.handle] = profileService.characteristics[characteristic.handle];
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
    return Object.values(profileCharacteristic.descriptors).map((e) => e.descriptor);
  }

  public saveDescriptors(handle: number, descriptors: GattDescriptor.AsObject[]): boolean {
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
      profileCharacteristic.descriptors[descriptor.handle] = { parent: new WeakRef(profileCharacteristic), descriptor };
      this.flatProfile.descriptors[descriptor.handle] = profileCharacteristic.descriptors[descriptor.handle];
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

  public findServiceByUuid(uuid: string): GattService.AsObject | null {
    for (const sEntry of Object.values(this.flatProfile.services ?? {})) {
      if (!sEntry) { continue; }
      if (sEntry.service.uuid === uuid) {
        return sEntry.service;
      }
    }
    return null;
  }

  public findCharacteristicByUuids(uuids: { serviceUuid: string; descriptorUuid: string }): GattCharacteristic.AsObject | null {
    let service: Service | null = null;
    for (const sEntry of Object.values(this.flatProfile.services ?? {})) {
      if (!sEntry) { continue; }
      if (sEntry.service.uuid === uuids.serviceUuid) {
        service = sEntry;
        break;
      }
    }

    if (!service) { return null; }

    for (const cEntry of Object.values(service.characteristics ?? {})) {
      if (!cEntry) { continue; }
      for (const dEntry of Object.values(cEntry.descriptors ?? {})) {
        if (!dEntry) { continue; }
        if (dEntry.descriptor.uuid === uuids.descriptorUuid) {
          return cEntry.characteristic;
        }
      }
    }

    return null;
  }

  public findDescriptorByUuids(uuids: { serviceUuid: string; descriptorUuid: string }): GattDescriptor.AsObject | null {
    let service: Service | null = null;
    for (const sEntry of Object.values(this.flatProfile.services ?? {})) {
      if (!sEntry) { continue; }
      if (sEntry.service.uuid === uuids.serviceUuid) {
        service = sEntry;
        break;
      }
    }

    if (!service) { return null; }

    for (const cEntry of Object.values(service.characteristics ?? {})) {
      if (!cEntry) { continue; }
      for (const dEntry of Object.values(cEntry.descriptors ?? {})) {
        if (!dEntry) { continue; }
        if (dEntry.descriptor.uuid === uuids.descriptorUuid) {
          return dEntry.descriptor;
        }
      }
    }

    return null;
  }
}
