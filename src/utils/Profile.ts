import { structuredClone } from '../utils/Utils';
import { entries } from '../../assigned numbers/16-bit UUID Numbers.json';
import { Profile, ServiceEntries, CharacteristicEntries } from '../gatt/GattDirectory';

interface Entries {
  [id: string]: { type: string; for: string; } | undefined;
}

export const amendProfileWithUuidNames = (p: Profile.AsObject): Profile.AsObject => {
  const uuidInfo = (uuid: string): { type: string; for: string; } | undefined => (entries as Entries)[uuid];
  const amendCharacteristic = (e: CharacteristicEntries.AsObject): CharacteristicEntries.AsObject => {
    e.characteristic.uuidInfo = uuidInfo(e.characteristic.uuid);
    for (const v of Object.values(e.descriptors)) {
      v.uuidInfo = uuidInfo(v.uuid);
    }
    return e;
  };
  const amendService = (e: ServiceEntries.AsObject): ServiceEntries.AsObject => {
    e.service.uuidInfo = uuidInfo(e.service.uuid);
    for (const v of Object.values(e.services)) {
      amendService(v);
    }
    for (const v of Object.values(e.characteristics)) {
      amendCharacteristic(v);
    }
    return e;
  };
  const profile = structuredClone(p);
  for (const v of Object.values(profile.services)) {
    amendService(v);
  }
  return profile;
};
