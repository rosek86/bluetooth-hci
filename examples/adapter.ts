import { Adapter } from '../facades/pc-ble-driver-js/adapter';
import { HciAdapterUtils } from '../src/utils/HciAdapterUtils';

(async () => {
  const hciAdapter = await HciAdapterUtils.createHciAdapter();

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
