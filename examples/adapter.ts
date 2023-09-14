import { Adapter } from '../facades/pc-ble-driver-js/adapter';
import { Utils } from './utils/Utils';

(async () => {
  const hciAdapter = await Utils.createHciAdapter();

  const adapter = new Adapter(hciAdapter);
  await adapter.open();

  await adapter.startScan({
    active: true,
    interval: 100,
    window: 100,
    timeout: 0,
  });

  adapter.on('deviceDiscovered', (device) => {
    console.log(device);
  });
})();
