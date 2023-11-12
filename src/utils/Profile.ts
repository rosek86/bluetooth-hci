import { entries } from '../assigned numbers/16-bit UUID Numbers.json';
import { Profile, Service, Characteristic, IncludedService, Descriptor } from '../gatt/GattDirectory';

interface Entries {
  [id: string]: { type: string; for: string; } | undefined;
}

export const uuidInfo = (uuid: string): { type: string; for: string; } | undefined => (entries as Entries)[uuid];

export const amendProfileWithUuidNames = (p: Profile): Profile => {
  const amendDescriptor = (e: Descriptor): Descriptor => {  
    e.descriptor.uuidInfo = uuidInfo(e.descriptor.uuid);
    return e;
  };
  const amendCharacteristic = (e: Characteristic): Characteristic => {
    e.characteristic.uuidInfo = uuidInfo(e.characteristic.uuid);
    for (const descriptor of Object.values(e.descriptors ?? {})) {
      amendDescriptor(descriptor);
    }
    return e;
  };
  const amendService = (e: Service | IncludedService): Service => {
    e.service.uuidInfo = uuidInfo(e.service.uuid);
    for (const includedService of Object.values(e.includedServices ?? {})) {
      amendService(includedService);
    }
    for (const characteristic of Object.values(e.characteristics ?? {})) {
      amendCharacteristic(characteristic);
    }
    return e;
  };
  for (const service of Object.values(p.services ?? {})) {
    amendService(service);
  }
  return p;
};

export const printProfile = (p: Profile): void => {
  const padding = (level: number) => ''.padStart(level, ' ');
  const printDescriptor = (e: Descriptor, level: number): void => {
    if (!e.descriptor.uuidInfo) {
      e.descriptor.uuidInfo = uuidInfo(e.descriptor.uuid);
    }
    const description = e.descriptor.uuidInfo?.for ? ` (${e.descriptor.uuidInfo?.for})` : '';
    console.log(padding(level) + `- D: ${e.descriptor.uuid}${description}`);
  };
  const printCharacteristic = (e: Characteristic, level: number): void => {
    const properties = Object.entries(e.characteristic.properties)
      .filter(([_, value]) => value === true)
      .map(([key]) => key)
      .join(',');

    if (!e.characteristic.uuidInfo) {
      e.characteristic.uuidInfo = uuidInfo(e.characteristic.uuid);
    }
    const description = e.characteristic.uuidInfo?.for ? ` (${e.characteristic.uuidInfo?.for})` : '';

    console.log(padding(level) + `- C: ${e.characteristic.uuid}${description}`);

    if (properties.length > 0) {
      console.log(padding(level) + `     (${properties})`);
    }

    for (const descriptor of Object.values(e.descriptors ?? {})) {
      printDescriptor(descriptor, level + 1);
    }
  };
  const printService = (e: Service | IncludedService, level = 0): void => {
    if (!e.service.uuidInfo) {
      e.service.uuidInfo = uuidInfo(e.service.uuid);
    }
    const description = e.service.uuidInfo?.for ? ` (${e.service.uuidInfo?.for})` : '';

    console.log(padding(level) + `- S: ${e.service.uuid}${description}`);

    for (const includedService of Object.values(e.includedServices ?? {})) {
      printService(includedService, level + 1);
    }
    for (const characteristic of Object.values(e.characteristics ?? {})) {
      printCharacteristic(characteristic, level + 1);
    }
  };
  for (const service of Object.values(p.services ?? {})) {
    printService(service);
  }
};
