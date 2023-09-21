import fs from 'fs/promises';
import chalk from 'chalk';
import { Utils } from './utils/Utils';
import {
  LePhy,
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates
} from '../src/hci/HciLeController';
import { DisconnectionCompleteEvent } from '../src/hci/HciEvent';
import { Gap, GapAdvertReport, GapConnectEvent } from '../src/gap/Gap';
import { Gatt, GattClient } from '../src/gatt/GattClient';
import { Profile } from '../src/gatt/GattDirectory';
import { amendProfileWithUuidNames } from '../src/utils/Profile';

interface GattProfileStore {
  address: string;
  rssi: number | null;
  profile?: Profile;
  advertisement?: GapAdvertReport;
  scanResponse?: GapAdvertReport;
}
const gattProfileStore = new Map<number, GattProfileStore>();

async function startScanning(gap: Gap) {
  await gap.setScanParameters({
    ownAddressType: LeOwnAddressType.RandomDeviceAddress,
    scanningFilterPolicy: LeScanningFilterPolicy.All,
    scanningPhy: {
      Phy1M: {
        type: LeScanType.Active,
        intervalMs: 100,
        windowMs: 100,
      },
    },
  });
  await gap.startScanning({ filterDuplicates: LeScanFilterDuplicates.Enabled });
}

(async () => {
  try {
    const adapter = await Utils.createHciAdapter();
    const hci = adapter.Hci;

    await Utils.defaultAdapterSetup(hci);
    await hci.leSetDefaultPhy({ txPhys: LePhy.Phy1M, rxPhys: LePhy.Phy1M });

    const gap = new Gap(hci);
    gap.on('GapLeScanState', (scanning) => console.log('scanning', scanning));
    gap.on('GapLeAdvReport', onAdvert);
    gap.on('GapConnected', onConnected);
    gap.on('GapDisconnected', onDisconnected);

    let state = 'idle';
    await gap.init();
    await startScanning(gap);

    async function onAdvert(report: GapAdvertReport) {
      let storeValue = gattProfileStore.get(report.address.toNumeric());
      if (!storeValue) {
        storeValue = { address: report.address.toString(), rssi: report.rssi };
      }
      if (!report.scanResponse) {
        storeValue.advertisement = report;
      } else {
        storeValue.scanResponse = report;
      }
      gattProfileStore.set(report.address.toNumeric(), storeValue);

      if (report.scanResponse === false && report.scannableAdvertising === true) {
        return;
      }
      if (report.connectableAdvertising === false) { return; }
      if (state !== 'idle') { return; }
      state = 'connecting';

      try {
        await gap.stopScanning();
        await gap.connect({ peerAddress: report.address });
        console.log(`Connecting to ${report.address.toString()}`);
      } catch (e) {
        console.log(e);
        state = 'idle';
      }
    }

    async function onConnected(event: GapConnectEvent) {
      state = 'connected';
      console.log(`Connected to ${event.address.toString()}`);

      const att = gap.getATT(event.connectionHandle);
      if (!att) {
        throw new Error('ATT layer not exists');
      }

      const versionInformation = gap.getRemoteVersionInformation(event.connectionHandle);
      if (!versionInformation) {
        throw new Error('Version information not exists');
      }
      console.log('Manufacturer: ', chalk.blue(Utils.manufacturerNameFromCode(versionInformation.manufacturerName)));

      let storeValue = gattProfileStore.get(event.address.toNumeric());
      if (!storeValue) {
        storeValue = { address: event.address.toString(), rssi: null };
      }

      console.log('Discovering...');
      const gatt = new GattClient(att, storeValue?.profile);
      const profile = await gatt.discover();
      console.log('Discovered');

      console.log('Disconnecting...');
      await hci.disconnect(event.connectionHandle);

      amendProfileWithUuidNames(profile);
      storeValue.profile = profile;
      gattProfileStore.set(event.address.toNumeric(), storeValue);

      console.log('writing gatt-profiles.json', gattProfileStore.size);
      fs.writeFile('gatt-profiles.json', JSON.stringify(Array.from(gattProfileStore.values()), null, 2))
        .catch((err) => console.log(err));
    }

    function onDisconnected(reason: DisconnectionCompleteEvent) {
      console.log('Disconnected', reason.connectionHandle, reason.reason);
      startScanning(gap)
        .catch((err) => console.log(err));
      state = 'idle';
    }

  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
