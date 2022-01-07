import { Utils } from './utils/Utils';
import { Address } from '../src/utils/Address';
import { AdvData } from '../src/gap/AdvData';

import {
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType
} from '../src/hci/HciLeController';

(async () => {
  try {
    const adapter = await Utils.createHciAdapter({
      usb: { vid: 0x2fe3, pid: 0x000e },
    });
    await Utils.defaultAdapterSetup(adapter.Hci);
    await adapter.Hci.leSetRandomAddress(Address.from(0x153c7f2c4b82));

    await adapter.Hci.leSetScanParameters({
      type: LeScanType.Active,
      intervalMs: 100,
      windowMs: 100,
      ownAddressType: LeOwnAddressType.PublicDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.All,
    });
    await adapter.Hci.leSetScanEnable(true, false);

    adapter.Hci.on('LeAdvertisingReport', (report) => {
      console.log(report, AdvData.parse(report.data ?? Buffer.alloc(0)));
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
