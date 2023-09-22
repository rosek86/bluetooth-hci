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
import { GapAdvertReport, GapConnectEvent } from '../src/gap/GapCentral';
import { GapProfileStorage } from '../src/gap/GapProfileStorage';
import { GattClient } from '../src/gatt/GattClient';
import { NbleGapCentral } from '../src/nble/NbleGapCentral';
import { Hci } from '../src/hci/Hci';

class App extends NbleGapCentral {
  private state: 'idle' | 'connecting' | 'connected' = 'idle';

  constructor(hci: Hci) {
    super(hci, {
      autoscan: true,
      scanOptions: {
        parameters: {
          ownAddressType: LeOwnAddressType.RandomDeviceAddress,
          scanningFilterPolicy: LeScanningFilterPolicy.All,
          scanningPhy: {
            Phy1M: {
              type: LeScanType.Active,
              intervalMs: 100,
              windowMs: 100,
            },
          },
        },
        start: {
          filterDuplicates: LeScanFilterDuplicates.Enabled,
        },
      },
    });
  }

  protected async onAdvert(report: GapAdvertReport): Promise<void> {
    try {
      GapProfileStorage.saveAdvertReport(report);

      if (report.scanResponse === false && report.scannableAdvertising === true) {
        return;
      }
      if (report.connectableAdvertising === false) { return; }
      if (this.state !== 'idle') { return; }
      this.state = 'connecting';

      const connectionTimeoutMs = 2000;
      await this.connect(report.address, connectionTimeoutMs);
      console.log(`Connecting to ${report.address.toString()}`);
    } catch (e) {
      console.log(e);
      this.state = 'idle';
    }
  }
  protected async onConnected(event: GapConnectEvent): Promise<void> {
    try {
      this.state = 'connected';
      console.log(`Connected to ${event.address.toString()}`);

      const versionInformation = this.gap.getRemoteVersionInformation(event.connectionHandle);
      const storeValue = GapProfileStorage.loadProfile(event.address);

      console.log('Discovering...');
      const att = this.gap.getAtt(event.connectionHandle);
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
      await this.disconnect(event.connectionHandle);

      amendProfileWithUuidNames(profile); // optional
      GapProfileStorage.saveProfile(event.address, profile);

      console.log('writing gatt-profiles.json', GapProfileStorage.Size);
      fs.writeFile('gatt-profiles.json', JSON.stringify(Array.from(GapProfileStorage.Storage.values()), null, 2))
        .catch((err) => console.log(err));
    } catch (err) {
      console.log('on connected', err);
    }
  }

  protected async onDisconnected(reason: DisconnectionCompleteEvent): Promise<void> {
    this.state = 'idle';
  }

  protected async onConnectionCancelled(): Promise<void> {
    this.state = 'idle';
  }
}

(async () => {
  try {
    const adapter = await Utils.createHciAdapter();
    const hci = adapter.Hci;

    await Utils.defaultAdapterSetup(hci);
    await hci.leSetDefaultPhy({ txPhys: LePhy.Phy1M, rxPhys: LePhy.Phy1M });

    const app = new App(hci);
    await app.start();
  } catch (e) {
    const err = e as Error;
    console.log('le-discover-cache', err.message);
  }
})();
