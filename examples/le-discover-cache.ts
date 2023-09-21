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
import { amendProfileWithUuidNames } from '../src/utils/Profile';
import { GapCentral, GapAdvertReport, GapConnectEvent } from '../src/gap/GapCentral';
import { GapProfileStorage } from '../src/gap/GapProfileStorage';
import { GattClient } from '../src/gatt/GattClient';

async function startScanning(gap: GapCentral) {
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

    const gap = new GapCentral(hci, {
      cacheRemoteInfo: true,
    });
    gap.on('GapLeScanState',          (scanning) => console.log('scanning', scanning));
    gap.on('GapLeAdvReport',          onAdvert);
    gap.on('GapConnected',            onConnected);
    gap.on('GapConnectionCancelled',  onConnectionCancelled);
    gap.on('GapDisconnected',         onDisconnected);

    let state = 'idle';
    await gap.init();
    await startScanning(gap);

    async function onAdvert(report: GapAdvertReport) {
      try {
        GapProfileStorage.saveAdvertReport(report);

        if (report.scanResponse === false && report.scannableAdvertising === true) {
          return;
        }
        if (report.connectableAdvertising === false) { return; }
        if (state !== 'idle') { return; }
        state = 'connecting';

        await gap.stopScanning();
        const connectionTimeoutMs = 2000;
        await gap.connect({ peerAddress: report.address }, connectionTimeoutMs);
        console.log(`Connecting to ${report.address.toString()}`);
      } catch (e) {
        console.log(e);
        state = 'idle';
      }
    }

    async function onConnected(event: GapConnectEvent) {
      try {
        state = 'connected';
        console.log(`Connected to ${event.address.toString()}`);

        const versionInformation = gap.getRemoteVersionInformation(event.connectionHandle);
        const storeValue = GapProfileStorage.loadProfile(event.address);

        console.log('Discovering...');
        const att = gap.getAtt(event.connectionHandle);
        const gatt = new GattClient(att, storeValue?.profile);
        const profile = await gatt.discover();
        console.log('Discovered');

        console.log('Manufacturer (RF):   ', chalk.blue(Utils.manufacturerNameFromCode(versionInformation.manufacturerName)));
        const identifier = storeValue.advertisement?.data?.manufacturerData?.ident ??
                           storeValue.scanResponse?.data?.manufacturerData?.ident;
        if (identifier) {
          console.log('Manufacturer (PROD): ', chalk.blue(Utils.manufacturerNameFromCode(identifier)));
        }
        console.log('Disconnecting...');
        await hci.disconnect(event.connectionHandle);

        amendProfileWithUuidNames(profile); // optional
        GapProfileStorage.saveProfile(event.address, profile);

        console.log('writing gatt-profiles.json', GapProfileStorage.Size);
        fs.writeFile('gatt-profiles.json', JSON.stringify(Array.from(GapProfileStorage.Storage.values()), null, 2))
          .catch((err) => console.log(err));
      } catch (err) {
        console.log('on connected', err);
      }
    }

    function onDisconnected(reason: DisconnectionCompleteEvent) {
      console.log('Disconnected', reason.connectionHandle, reason.reason);
      startScanning(gap)
        .catch((err) => console.log('disconnected', err));
      state = 'idle';
    }

    function onConnectionCancelled() {
      console.log('Connection cancelled');
      startScanning(gap)
        .catch((err) => console.log('connection cancelled - start scanning', err));
      state = 'idle';
    }

  } catch (e) {
    const err = e as Error;
    console.log('le-discover-cache', err.message);
  }
})();
