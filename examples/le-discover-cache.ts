import fs from 'fs/promises';
import chalk from 'chalk';
import { HciAdapterUtils } from '../src/utils/HciAdapterUtils';
import {
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates
} from '../src/hci/HciLeController';
import { DisconnectionCompleteEvent } from '../src/hci/HciEvent';
import { GapAdvertReport, GapConnectEvent } from '../src/gap/GapCentral';
import { GapProfileStorage } from '../src/gap/GapProfileStorage';
import { NbleGapCentral } from '../src/nble/NbleGapCentral';
import { GattClient } from '../src/gatt/GattClient';
import { HciAdapter } from '../src/utils/HciAdapter';

class App extends NbleGapCentral {
  private state: 'idle' | 'connecting' | 'connected' = 'idle';
  private advReportStorage = new Map<number, { advertisement?: GapAdvertReport; scanResponse?: GapAdvertReport }>();

  constructor(adapter: HciAdapter) {
    super(adapter, {
      autoScan: true,
      autoScanOptions: {
        scanWhenConnected: false,
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
      this.saveAdvertReport(report);

      if (report.scanResponse === false && report.scannableAdvertising === true) {
        // Wait for scan response
        return;
      }
      if (report.connectableAdvertising === false) {
        // Skip non-connectable devices
        return;
      }

      // Prevent multiple connections requests
      if (this.state !== 'idle') { return; }
      this.state = 'connecting';

      // Connect to device with timeout
      await this.connect(report.address, { connectionTimeoutMs: 2000 });
      console.log(`Connecting to ${report.address.toString()}...`);

    } catch (e) {
      console.log(`Error while connecting to ${report.address.toString()}`, e);
      this.state = 'idle';
    }
  }

  protected async onConnected(event: GapConnectEvent): Promise<void> {
    // Device connected, discovering services
    this.state = 'connected';
    console.log(`Connected to ${event.address.toString()}`);
    console.log(`Discovering services on ${event.address.toString()}...`);
  }

  protected async onServicesDiscovered(event: GapConnectEvent, gatt: GattClient): Promise<void> {
    console.log('Discovered services on', event.address.toString());

    this.printManufacturerInfo(event);

    console.log('Disconnecting...');
    await this.disconnect(event.connectionHandle);

    await this.saveProfilesToFile();
  }

  protected async onDisconnected(reason: DisconnectionCompleteEvent): Promise<void> {
    console.log('Disconnected', reason.connectionHandle, reason.reason);
    this.state = 'idle';
  }

  protected async onConnectionCancelled(): Promise<void> {
    console.log('Connection cancelled (timeout)');
    this.state = 'idle';
  }

  private printManufacturerInfo(event: GapConnectEvent) {
    const versionInformation = this.gap.getRemoteVersionInformation(event.connectionHandle);
    console.log('Manufacturer (RF):   ', chalk.blue(this.adapter.manufacturerNameFromCode(versionInformation.manufacturerName)));

    const storeValue = this.advReportStorage.get(event.address.toNumeric()) ?? {};
    const identifier = storeValue.advertisement?.data?.manufacturerData?.ident ??
                       storeValue.scanResponse?.data?.manufacturerData?.ident;
    if (identifier) {
      console.log('Manufacturer (PROD): ', chalk.blue(this.adapter.manufacturerNameFromCode(identifier)));
    }
  }

  private saveAdvertReport(report: GapAdvertReport) {
    const numericAddress = report.address.toNumeric();
    const storageValue = this.advReportStorage.get(numericAddress) ?? {};
    if (!report.scanResponse) {
      storageValue.advertisement = report;
    } else {
      storageValue.scanResponse = report;
    }
    this.advReportStorage.set(numericAddress, storageValue);
  }

  private async saveProfilesToFile() {
    try {
      const entries = Array.from(GapProfileStorage.Storage.entries()).map(([key, entry]) => {
        return {
          address: entry.address,
          advertisement: this.advReportStorage.get(key)?.advertisement,
          scanResponse: this.advReportStorage.get(key)?.scanResponse,
          profile: entry.profile,
        }
      });
      console.log('writing gatt-profiles.json', GapProfileStorage.Size);
      await fs.writeFile('gatt-profiles.json', JSON.stringify(entries, null, 2));
    } catch (e) {
      console.log(e);
    }
  }
}

(async () => {
  try {
    const adapter = await HciAdapterUtils.createHciAdapter();
    const app = new App(adapter);
    await app.start();
  } catch (e) {
    const err = e as Error;
    console.log('le-discover-cache', err.message);
  }
})();

process.on('unhandledRejection', (error) => {
  console.error('unhandledRejection', error);
  throw error;
});
