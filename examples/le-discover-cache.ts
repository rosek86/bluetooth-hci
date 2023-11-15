import fs from 'fs/promises';
import chalk from 'chalk';

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
import { printProfile } from '../src/utils/Profile';
import { Address } from '../src/utils/Address';
import { createHciSerial } from '../src/utils/SerialHciDevice';
import { delay } from '../src/utils/Utils';

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

      const name = this.getCompleteLocalName(report.address);
      // if (name !== 'Nordic_LBS') { return; }

      // Prevent multiple connections requests
      if (this.state !== 'idle') { return; }
      this.state = 'connecting';

      // Connect to device with timeout
      await this.connect(report.address, { connectionTimeoutMs: 2000 });
      console.log(`Connecting to ${report.address.toString()} (${name}) at RSSI ${report.rssi} dBm...`);

    } catch (e) {
      console.log(`Error while connecting to ${report.address.toString()}`, e);
      this.state = 'idle';
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

  protected async onConnected(event: GapConnectEvent): Promise<void> {
    // Device connected, discovering services
    this.state = 'connected';
    console.log(`Connected to ${event.address.toString()}`);
    console.log(`Discovering services on ${event.address.toString()}...`);
  }

  protected async onServicesDiscovered(event: GapConnectEvent, gatt: GattClient): Promise<void> {
    try {
      console.log('Discovered services on', event.address.toString());

      this.printManufacturerInfo(event);
      printProfile(gatt.Profile);
      await this.saveProfilesToFile();

      // Example for Nordic_LBS
      const characteristic = gatt.findCharacteristicByUuids({
        serviceUuid: '000015231212efde1523785feabcd123',
        descriptorUuid: '000015241212efde1523785feabcd123',
      });
      const descriptor = gatt.findDescriptorByUuid({
        serviceUuid: '000015231212efde1523785feabcd123',
        descriptorUuid: '000015241212efde1523785feabcd123',
      });

      if (characteristic && descriptor) {
        await gatt.startCharacteristicsNotifications(characteristic, false);

        gatt.on('GattNotification', (event) => {
          console.log('Notification', event);
        });

        for (let i = 0; i < 60; i++) {
          console.log(await gatt.read(descriptor));
          delay(1000);
        }
        // await gatt.write({ handle: 21 }, Buffer.from([0x01]));
      }
    } catch (e) {
      console.log(e);
    } finally {
      console.log('Disconnecting...');
      await this.disconnect(event.connectionHandle);
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
    this.state = 'idle';
  }

  protected async onConnectionCancelled(): Promise<void> {
    console.log('Connection cancelled (timeout)');
    this.state = 'idle';
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
