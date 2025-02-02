import {
  Address,
  AddressType,
  GapCentral,
  HciAdapter,
  LeOwnAddressType,
  LeScanFilterDuplicates,
  LeScanType,
  LeScanningFilterPolicy,
  LeWhiteListAddressType,
  createHciSerial,
} from "../../src/index.ts";
import { ArgsParser } from "../utils/ArgsParser.ts";

(async () => {
  try {
    const args = await ArgsParser.getOptions();
    if (!args || args.type !== "serial") {
      throw new Error("Invalid input parameters");
    }

    const adapter = new HciAdapter(await createHciSerial(args.deviceId, args.serial));
    await adapter.open();
    await adapter.defaultAdapterSetup();

    const hci = adapter.Hci;
    await hci.leAddDeviceToWhiteList({
      addressType: LeWhiteListAddressType.Random,
      address: Address.from(0x1429c386d3a9, AddressType.RandomDeviceAddress),
    });

    const gap = new GapCentral(hci, {
      autoScan: false,
    });
    await gap.init();

    await gap.setScanParameters({
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.FromWhiteList,
      scanningPhy: {
        PhyCoded: {
          type: LeScanType.Active,
          intervalMs: 100,
          windowMs: 100,
        },
      },
    });
    await gap.startScanning({ filterDuplicates: LeScanFilterDuplicates.Enabled });

    gap.on("GapLeAdvReport", (report) => {
      console.log(report);
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  } finally {
    // port.close();
  }
})();
