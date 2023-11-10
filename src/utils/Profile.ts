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
