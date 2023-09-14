import { Utils } from './utils/Utils';

import { Gap } from '../src/gap/Gap';
import { Gatt } from '../src/gatt/Gatt';
import { LeScanFilterDuplicates } from '../src/hci/HciLeController';
import { amendProfileWithUuidNames, uuidInfo } from '../src/utils/Profile';
import { GattService } from '../src/gatt/GattService';
import { GattCharacteristic } from '../src/gatt/GattCharacteristic';

(async () => {
  try {
    const adapter = await Utils.createHciAdapter({
      deviceType: 'serial',
    });
    await Utils.defaultAdapterSetup(adapter.Hci);

    const gap = new Gap(adapter.Hci);
    await gap.init();

    await gap.setScanParameters();
    await gap.startScanning({ filterDuplicates: LeScanFilterDuplicates.Enabled });
    console.log('scanning...');

    gap.on('GapLeScanState', (scanning) => {
      console.log('scanning', scanning);
    });

    gap.on('GapLeAdvReport', async (report) => {
      console.log(report);
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
