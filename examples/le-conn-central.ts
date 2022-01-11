import { Utils } from './utils/Utils';
import { Address, AddressType } from '../src/utils/Address';

import {
  LePhy,
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates
} from '../src/hci/HciLeController';

import { Gap } from '../src/gap/Gap';

(async () => {
  try {
    const adapter = await Utils.createHciAdapter({
      usb: { vid: 0x2fe3, pid: 0x000d },
    });
    const hci = adapter.Hci;

    await Utils.defaultAdapterSetup(hci);
    await hci.leSetDefaultPhy({ txPhys: LePhy.Phy1M, rxPhys: LePhy.Phy1M });

    const gap = new Gap(adapter.Hci);

    await gap.init();
    await gap.setScanParameters({
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.All,
      scanningPhy: {
        Phy1M: {
          type: LeScanType.Active,
          intervalMs: 11.25,
          windowMs: 11.25
        },
      },
    });
    await gap.startScanning({ filterDuplicates: LeScanFilterDuplicates.Enabled });

    gap.on('GapLeScanState', (scanning) => {
      console.log('scanning', scanning);
    });

    let connecting = false;
    gap.on('GapLeAdvReport', async (report) => {
      if (connecting) { return; }
      if (report.address.toString() !== 'AA:BB:CC:DD:EE:FF') {
        return;
      }

      connecting = true;
      console.log('connecting...');
      await gap.stopScanning();
      await gap.connect(report.address);
    });

    gap.on('GapConnected', async (event) => {
      connecting = false;

      console.log(
        'connected',
        event.connectionHandle,
        event.connectionParams,
        event.versionInfo,
        event.leRemoteFeatures.toString(),
      );

      const att = gap.getATT(event.connectionHandle);
      if (!att) {
        throw new Error('ATT layer not exists');
      }

      const rssi = await hci.readRssi(event.connectionHandle);
      console.log(`RSSI: ${rssi} dBm`);

      const powerLevels = await gap.readTransmitPowerLevels(event.connectionHandle);
      console.log(`Power Level: ${powerLevels.current}/${powerLevels.maximum} dBm`);

      const phy = await hci.leReadPhy(event.connectionHandle);
      console.log('PHY:', phy);

      const dataLength = await hci.leSetDataLengthAwait(event.connectionHandle, {
        txOctets: 200,
        txTime:   2000,
      });
      console.log('data-length', dataLength);

      const mtu = await att.exchangeMtuReq({ mtu: 200 });
      console.log('mtu', mtu);

      const info = await att.findInformationReq({
        startingHandle: 0x0001, endingHandle: 0xFFFF,
      });
      console.log(info);

      const connParams = await gap.connectionUpdate({
        connectionHandle: event.connectionHandle,
        connectionIntervalMinMs: 40,
        connectionIntervalMaxMs: 90,
        connectionLatency: 0,
        supervisionTimeoutMs: 5000,
        minCeLengthMs: 2.5,
        maxCeLengthMs: 3.75,
      });
      console.log(connParams);

      setTimeout(async () => {
        await hci.disconnect(event.connectionHandle);
      }, 2000);
    });

    gap.on('GapDisconnected', (reason) => {
      console.log('disconnected', reason);
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
