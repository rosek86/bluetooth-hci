import { HciAdapterUtils } from '../src/utils/HciAdapterUtils';

import { GapCentral, GapAdvertReport } from '../src/gap/GapCentral';
import { LeScanFilterDuplicates } from '../src/hci/HciLeController';

(async () => {
  let printTime = Date.now();
  const adverts = new Map<string, { adv?: GapAdvertReport; sr?: GapAdvertReport }>();

  try {
    const adapter = await HciAdapterUtils.createHciAdapter();
    await HciAdapterUtils.defaultAdapterSetup(adapter.Hci);

    const gap = new GapCentral(adapter.Hci);
    await gap.init();

    await gap.setScanParameters();
    await gap.startScanning({ filterDuplicates: LeScanFilterDuplicates.Enabled });
    console.log('scanning...');

    gap.on('GapLeScanState', (scanning) => {
      console.log('scanning', scanning);
    });

    gap.on('GapLeAdvReport', async (report) => {
      const { address, scanResponse } = report;

      const entry = adverts.get(address.toString()) ?? {};
      if (scanResponse) {
        entry.sr = report;
      } else {
        entry.adv = report;
      }
      adverts.set(address.toString(), entry);

      if ((Date.now() - printTime) > 1000) {
        printTime = Date.now();
        print(adverts);
      }
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();

function print(adverts: Map<string, { adv?: GapAdvertReport; sr?: GapAdvertReport }>) {
  console.log();
  console.log('adverts', adverts.size);
  for (const [ address, { adv, sr } ] of adverts.entries()) {
    const ident = (adv?.data?.manufacturerData ?? sr?.data?.manufacturerData)?.ident;

    console.log(address, ident ? HciAdapterUtils.manufacturerNameFromCode(ident) : '');

    if (adv) {
      console.log(`                 `, adv?.rssi, JSON.stringify(adv?.data));
    }
    if (sr) {
      console.log(`                 `, sr?.rssi, JSON.stringify(sr?.data));
    }
  }
}
