import { Utils } from '../utils/Utils';
import { Address } from '../../src/utils/Address';

import { Gap } from '../../src/gap/Gap';

import {
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates,
  LeWhiteListAddressType
} from '../../src/hci/HciLeController';

(async () => {
  try {
    const adapter = await Utils.createHciAdapter();
    await Utils.defaultAdapterSetup(adapter.Hci);
    const hci = adapter.Hci;

    await hci.leAddDeviceToWhiteList({
      addressType:  LeWhiteListAddressType.Random,
      address:      Address.from(0x1429c386d3a9),
    });

    const gap = new Gap(hci);
    await gap.init();

    await gap.setScanParameters({
      ownAddressType:       LeOwnAddressType.RandomDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.FromWhiteList,
      scanningPhy: {
        PhyCoded: {
          type:       LeScanType.Active,
          intervalMs: 100,
          windowMs:   100,
        },
      },
    });
    await gap.startScanning({ filterDuplicates: LeScanFilterDuplicates.Enabled });

    gap.on('GapLeAdvReport', (report) => {
      console.log(report);
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  } finally {
    // port.close();
  }
})();
