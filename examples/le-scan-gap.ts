import { Utils } from './utils/Utils';
import { Address } from '../src/utils/Address';

import { Gap } from '../src/gap/Gap';
import { Gatt } from '../src/gatt/Gatt';
import { LeScanFilterDuplicates } from '../src/hci/HciLeController';

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

    gap.on('GapConnected', async (event) => {
      console.log('connected', event);
      connecting = false;

      const rssi = await adapter.Hci.readRssi(event.connectionHandle);
      console.log(`RSSI: ${rssi} dBm`);

      const att = gap.getATT(event.connectionHandle);
      if (!att) {
        throw new Error('ATT layer not exists');
      }

      const gatt = new Gatt(att);

      await gatt.exchangeMtu(50);

      const services = await gatt.discoverServices();
      for (const service of services) {
        console.log('');
        console.log('service', service);

        const characteristics = await gatt.discoverCharacteristics(service);
        for (const characteristic of characteristics) {
          console.log('characteristics', characteristic);

          if (characteristic.Properties.read === true) {
            const result = await gatt.read(characteristic.Handle);
            console.log(service.UUID, characteristic.UUID, result, result.toString('ascii'));
          }

          const descriptors = await gatt.discoverDescriptors(characteristic);
          for (const descriptor of descriptors) {
            console.log('descriptors', descriptor);

            if (characteristic.Properties.read === true) {
              const result = await gatt.read(descriptor.Handle);
              console.log(service.UUID, characteristic.UUID, descriptor.UUID, result, result.toString('ascii'));
            }
          }
        }
      }

      await gap.disconnect(event.connectionHandle);
    });

    gap.on('GapDisconnected', async (reason) => {
      connecting = false;
      console.log('DisconnectionComplete', reason);

      await gap.setScanParameters();
      await gap.startScanning({ filterDuplicates: LeScanFilterDuplicates.Enabled });
    });

    let connecting = false;
    gap.on('GapLeAdvReport', async (report) => {
      if (connecting) { return; }
      if (report.data.completeLocalName) {
        console.log(report.address, report.data.completeLocalName, report.rssi, report.scanResponse);
      }
      if (report.data.completeLocalName !== 'Tacx Flux 39756') {
        return;
      }

      connecting = true;
      console.log('connecting...');
      await gap.stopScanning();
      await gap.connect(report.address);
    });

    await gap.setScanParameters();
    await gap.startScanning({ filterDuplicates: LeScanFilterDuplicates.Enabled });
    console.log('scanning...');
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
