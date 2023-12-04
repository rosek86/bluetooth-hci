import fs from 'fs/promises';
import chalk from 'chalk';

import {
  createHciSerial,
  HciAdapter,
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates,
  DisconnectionCompleteEvent,
  GapAdvertReport,
  GapConnectEvent,
  GapProfileStorage,
  GattClient,
  NbleGapCentral,
  printProfile,
  Address,
  NbleError
} from '../src';

class App extends NbleGapCentral {
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

    this.on('error', (err) => console.log('NbleGapCentral Error:', err));
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

      // Connect to device with timeout
      await this.connect({ peerAddress: report.address, timeoutMs: 2000 });

      const name = this.getCompleteLocalName(report.address);
      console.log(`Connecting to ${report.address.toString()} (${name}) at RSSI ${report.rssi} dBm...`);

    } catch (e) {
      if (e instanceof NbleError && e.code === 'NBLE_ERR_ALREADY_CONNECTING') {
        return; // ignore
      }
      console.log(`Error while connecting to ${report.address.toString()}`, e);
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

  private getCompleteLocalName(address: Address) {
    const storeValue = this.advReportStorage.get(address.toNumeric()) ?? {};
    return storeValue.advertisement?.data?.completeLocalName ?? storeValue.scanResponse?.data?.completeLocalName ?? 'N/A';
  }

  protected async onConnected(event: GapConnectEvent, gatt: GattClient): Promise<void> {
    try {
      console.log(`Connected to ${event.address.toString()}`);

      console.log(`Discovering services on ${event.address.toString()}...`);
      const profile = await gatt.discover();
      this.saveProfile(event.address, profile); // cache profile
      console.log('Discovered services on', event.address.toString());

      this.printManufacturerInfo(event);
      printProfile(gatt.Profile);
      await this.saveProfilesToFile();
    } catch (e) {
      console.log(e);
    } finally {
      console.log('Disconnecting...');
      await this.disconnect(event.connectionHandle)
        .catch(() => {});
    }
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

  protected async onDisconnected(reason: DisconnectionCompleteEvent): Promise<void> {
    console.log('Disconnected', reason.connectionHandle, reason.reason);
  }

  protected async onConnectionCancelled(): Promise<void> {
    console.log('Connection cancelled (timeout)');
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
    const adapter = new HciAdapter(await createHciSerial());
    await adapter.open();
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
