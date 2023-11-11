import { HciAdapterUtils } from '../src/utils/HciAdapterUtils';
import { AdvData } from '../src/gap/AdvData';

import {
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates
} from '../src/hci/HciLeController';

(async () => {
  try {
    const adapter = await HciAdapterUtils.createHciAdapter();
    await adapter.defaultAdapterSetup();

    await adapter.Hci.leSetExtendedScanParameters({
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.All,
      scanningPhy: {
        Phy1M: {
          intervalMs: 100,
          windowMs: 100,
          type: LeScanType.Active,
        },
      },
    });
    await adapter.Hci.leSetExtendedScanEnable({
      enable: true,
      filterDuplicates: LeScanFilterDuplicates.Disabled,
    });

    adapter.Hci.on('LeExtendedAdvertisingReport', (report) => {
      console.log(report, AdvData.parse(report.data ?? Buffer.alloc(0)));
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
