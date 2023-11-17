import { Profile } from "../gatt/GattDirectory.js";
import { Address } from "../utils/Address.js";

export interface GapProfileStorageEntry {
  address: string;
  profile?: Profile;
}

export class GapProfileStorage {
  private constructor() {}

  private static storage = new Map<number, GapProfileStorageEntry>();

  public static saveProfile(address: Address, profile: Profile) {
    const numericAddress = address.toNumeric();
    const storageValue = this.storage.get(numericAddress) ?? { address: address.toString() };
    storageValue.profile = profile;
    this.storage.set(numericAddress, storageValue);
  }

  public static loadProfile(address: Address): GapProfileStorageEntry {
    return this.storage.get(address.toNumeric()) ?? { address: address.toString() };
  }

  public static get Size() {
    return this.storage.size;
  }

  public static get Storage() {
    return this.storage;
  }
}
