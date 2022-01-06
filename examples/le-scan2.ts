import { Utils } from './utils/Utils';
import { Address } from '../src/utils/Address';

import { Gap } from '../src/gap/Gap';

import {
  LeScanFilterDuplicates,
  LeScanType,
} from '../src/hci/HciLeController';

(async () => {
  try {
    const adapter = await Utils.createHciAdapter({
      usb: { vid: 0x2fe3, pid: 0x000d },
    });
    await Utils.defaultAdapterSetup(adapter.Hci);
    await adapter.Hci.leSetRandomAddress(Address.from(0x153c7f2c4b82));

    const gap = new Gap(adapter.Hci);
    await gap.init();


    gap.on('GapLeScanState', (scanning) => {
      console.log('scanning', scanning);
    });
    gap.on('GapLeAdvReport', (report, raw) => {
      if (report.data.completeLocalName) {
        console.log(report.data.completeLocalName, report.rssi, report.scanResponse);
      }
    });

    await gap.setScanParameters({
      scanningPhy: {
        Phy1M: {
          type: LeScanType.Active,
          intervalMs: 100,
          windowMs: 100,
        },
      },
    });
    await gap.startScanning({
      filterDuplicates: LeScanFilterDuplicates.Enabled,
      durationMs: 5000,
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  } finally {
    // port.close();
  }
})();
