import { Utils } from '../utils/Utils';
import { Address } from '../../src/utils/Address';
import { AdvData } from '../../src/gap/AdvData';

import { Gap } from '../../src/gap/Gap';

import {
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates,
  LeWhiteListAddressType
} from '../../src/hci/HciLeController';
import { LeExtAdvReport } from '../../src/hci/HciEvent';

(async () => {
  try {
    const adapter = await Utils.createHciAdapter({
      usb: { vid: 0x2fe3, pid: 0x000e },
    });
    const hci = adapter.Hci;

    await Utils.defaultAdapterSetup(hci);

    await hci.leAddDeviceToWhiteList({
      addressType:  LeWhiteListAddressType.Random,
      address:      Address.from(0x1429c386d3a9),
    });

    await hci.leSetRandomAddress(Address.from(0x153c7f2c4b82));

    const gap = new Gap(hci);

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

    gap.on('adv-report', (report: LeExtAdvReport, data: AdvData) => {
      console.log(report, data);
    });

    console.log('end');
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  } finally {
    // port.close();
  }
})();
