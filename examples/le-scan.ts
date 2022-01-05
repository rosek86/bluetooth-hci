import { Utils } from './utils/Utils';
import { Address } from '../src/utils/Address';
import { AdvData } from '../src/gap/AdvData';

import { Gap } from '../src/gap/Gap';

import {
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates,
  LeWhiteListAddressType
} from '../src/hci/HciLeController';
import { LeExtAdvReport } from '../src/hci/HciEvent';

(async () => {
  try {
    const adapter = await Utils.createHciAdapter({
      usb: { vid: 0x2fe3, pid: 0x000e },
    });
    const hci = adapter.Hci;

    await Utils.defaultAdapterSetup(hci);

    await hci.leSetRandomAddress(Address.from(0x153c7f2c4b82));

    console.log('set scan params');
    await hci.leSetScanParameters({
      type: LeScanType.Active,
      intervalMs: 100,
      windowMs: 100,
      ownAddressType: LeOwnAddressType.PublicDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.All,
    });

    console.log('set scan enabled');
    await hci.leSetScanEnable(true, false);

    console.log('end');
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  } finally {
    // port.close();
  }
})();
