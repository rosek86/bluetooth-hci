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
    const adapter = await Utils.createHciAdapter();
    await Utils.defaultAdapterSetup(adapter.Hci);

    await adapter.Hci.leSetScanParameters({
      type: LeScanType.Active,
      intervalMs: 1000,
      windowMs: 100,
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.All,
    });
    await adapter.Hci.leSetScanEnable(true, true);

    adapter.Hci.on('LeAdvertisingReport', (report) => {
      console.log(report, AdvData.parse(report.data ?? Buffer.alloc(0)));
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
