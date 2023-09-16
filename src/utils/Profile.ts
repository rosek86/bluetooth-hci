import { entries } from '../../assigned numbers/16-bit UUID Numbers.json';
import { Profile, Service, Characteristic } from '../gatt/GattDirectory';

interface Entries {
  [id: string]: { type: string; for: string; } | undefined;
}

export const uuidInfo = (uuid: string): { type: string; for: string; } | undefined => (entries as Entries)[uuid];

export const amendProfileWithUuidNames = (p: Profile.AsObject): Profile.AsObject => {
  const amendCharacteristic = (e: Characteristic.AsObject): Characteristic.AsObject => {
    e.characteristic.uuidInfo = uuidInfo(e.characteristic.uuid);
    for (const v of e.descriptors) {
      v.uuidInfo = uuidInfo(v.uuid);
    }
    return e;
  };
  const amendService = (e: Service.AsObject): Service.AsObject => {
    e.service.uuidInfo = uuidInfo(e.service.uuid);
    for (const v of e.services) {
      amendService(v);
    }
    for (const v of e.characteristics) {
      amendCharacteristic(v);
    }
    return e;
  };
  const profile = structuredClone(p);
  for (const v of profile.services) {
    amendService(v);
  }
  return profile;
};
