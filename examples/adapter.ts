import { Adapter } from '../facades/pc-ble-driver-js/adapter';
import { Utils } from './utils/Utils';

(async () => {
  const hciAdapter = await Utils.createHciAdapter({
    deviceType: 'usb',
    usb: { vid: 0x0b05, pid: 0x190e }, // BT5
  });

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
