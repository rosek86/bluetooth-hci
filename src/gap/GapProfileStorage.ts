import { Profile } from "../gatt/GattDirectory";
import { Address } from "../utils/Address";
import { GapAdvertReport } from "./GapCentral";

export interface GapProfileStorageEntry {
  address: string;
  rssi: number | null;
  profile?: Profile;
  advertisement?: GapAdvertReport;
  scanResponse?: GapAdvertReport;
}

export class GapProfileStorage {
  private constructor() {}

  private static storage = new Map<number, GapProfileStorageEntry>();

  public static saveAdvertReport(report: GapAdvertReport) {
    const numericAddress = report.address.toNumeric();
    let storageValue = this.storage.get(numericAddress);
    if (!storageValue) {
      storageValue = { address: report.address.toString(), rssi: null };
    }
    storageValue.rssi = report.rssi;
    if (!report.scanResponse) {
      storageValue.advertisement = report;
    } else {
      storageValue.scanResponse = report;
    }
    this.storage.set(numericAddress, storageValue);
  }

  public static saveProfile(address: Address, profile: Profile) {
    const numericAddress = address.toNumeric();
    let storageValue = this.storage.get(numericAddress);
    if (!storageValue) {
      storageValue = { address: address.toString(), rssi: null };
    }
    storageValue.profile = profile;
    this.storage.set(numericAddress, storageValue);
  }

  public static loadProfile(address: Address): GapProfileStorageEntry {
    const storageValue = this.storage.get(address.toNumeric());
    if (!storageValue) {
      return { address: address.toString(), rssi: null };
    }
    return storageValue;
  }

  public static get Size() {
    return this.storage.size;
  }

  public static get Storage() {
    return this.storage;
  }
}
