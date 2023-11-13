# bluetooth-hci

NOTE: This is the initial version of the library, with basic functionalities such as advertising and scanning operational. It is possible to establish a connection, but further development is required to bring this library to a production-ready level.

The library implements a Bluetooth 5 HCI host, focusing mainly on Bluetooth Low Energy (LE).

## Getting started

The most straightforward method to test this library is by utilizing the **nRF52840 Dongle**. Simply load the pre-compiled firmware located at `/zephyr/hci_uart/zephyr.hex`. A detailed description explaining how to prepare the nRF52840 Dongle can be found [here](docs/GettingStarted.md).

```
npm install bluetooth-hci
```

## Examples

Additional examples are available in the 'examples' directory.

### Simple scanning

```ts
import { createHciSerial, HciAdapter } from 'bluetooth-hci';
import { AdvData } from 'bluetooth-hci';

import {
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates
} from 'bluetooth-hci';

(async () => {
  try {
    const adapter = new HciAdapter(await createHciSerial());
    await adapter.open();

    await adapter.defaultAdapterSetup();

    await adapter.Hci.leSetExtendedScanParameters({
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.All,
      scanningPhy: {
        Phy1M: {
          intervalMs: 100,
          windowMs: 100,
          type: LeScanType.Active,
        },
      },
    });
    await adapter.Hci.leSetExtendedScanEnable({
      enable: true,
      filterDuplicates: LeScanFilterDuplicates.Disabled,
    });

    adapter.Hci.on('LeExtendedAdvertisingReport', (report) => {
      console.log(report, AdvData.parse(report.data ?? Buffer.alloc(0)));
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
```

### Simple advertising

```ts
import {
  LeAdvertisingEventProperties,
  LeAdvertisingChannelMap,
  LeOwnAddressType,
  LePeerAddressType,
  LeAdvertisingFilterPolicy,
  LePrimaryAdvertisingPhy,
  LeSecondaryAdvertisingPhy,
  LeAdvertisingDataOperation,
  LeScanResponseDataOperation
} from 'bluetooth-hci';
import { Address, AdvData } from 'bluetooth-hci';
import { createHciSerial, HciAdapter } from 'bluetooth-hci';

(async () => {
  try {
    const adapter = new HciAdapter(await createHciSerial());
    await adapter.open();

    await adapter.defaultAdapterSetup();
    const hci = adapter.Hci;

    const selectedTxPower = await hci.leSetExtendedAdvertisingParametersV1(0, {
      advertisingEventProperties: [
        LeAdvertisingEventProperties.UseLegacyPDUs,
        LeAdvertisingEventProperties.Connectable,
        LeAdvertisingEventProperties.Scannable,
      ],
      primaryAdvertisingIntervalMinMs: 500,
      primaryAdvertisingIntervalMaxMs: 1000,
      primaryAdvertisingChannelMap: [
        LeAdvertisingChannelMap.Channel37,
        LeAdvertisingChannelMap.Channel38,
        LeAdvertisingChannelMap.Channel39,
      ],
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      peerAddressType: LePeerAddressType.PublicDeviceAddress,
      peerAddress: Address.from(0x000000000000),
      advertisingFilterPolicy: LeAdvertisingFilterPolicy.Any,
      primaryAdvertisingPhy: LePrimaryAdvertisingPhy.Phy1M,
      secondaryAdvertisingMaxSkip: 0,
      secondaryAdvertisingPhy: LeSecondaryAdvertisingPhy.Phy1M,
      advertisingSid: 0,
      scanRequestNotificationEnable: false,
      advertisingTxPower: 8,
    });
    console.log(`TX Power: ${selectedTxPower}`);

    await hci.leSetAdvertisingSetRandomAddress(0, Address.from(0x1429c386d3a9));

    const advertisingData = AdvData.build({
      flags: 6,
      completeLocalName: 'Bluetooth HCI',
      manufacturerData: {
        ident: 0x0689,
        data: Buffer.from([41, 0]),
      },
    });
    await hci.leSetExtendedAdvertisingData(0, {
      operation: LeAdvertisingDataOperation.Complete,
      fragment: false,
      data: advertisingData,
    });

    const scanResponseData = AdvData.build({
      completeListOf16bitServiceClassUuids: [ '1826', '1818' ],
      completeListOf128bitServiceClassUuids: [
        '669aa6050c08969ee21186ad5062675f'
      ],
      serviceData16bitUuid: [{
        uuid: '1826',
        data: Buffer.from([ 1, 0, 32 ]),
      }],
    });
    await hci.leSetExtendedScanResponseData(0, {
      operation: LeScanResponseDataOperation.Complete,
      fragment: false,
      data: scanResponseData,
    });

    await hci.leSetExtendedAdvertisingEnable({
      enable: true,
      sets: [{ advertHandle: 0 }],
    });

    console.log('advertising...');
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
```

### Connect, discover services

```ts
import chalk from 'chalk';
import {
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates
} from 'bluetooth-hci';
import { DisconnectionCompleteEvent } from 'bluetooth-hci';
import { Address, printProfile } from 'bluetooth-hci';
import { createHciSerial, HciAdapter } from 'bluetooth-hci';
import { GattClient, GapAdvertReport, GapConnectEvent } from 'bluetooth-hci';
import { NbleGapCentral } from 'bluetooth-hci';

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

      const name = '(' + this.getCompleteLocalName(report.address) + ')';
      console.log(`Connecting to ${report.address.toString()} ${name} at RSSI ${report.rssi} dBm...`);

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
```

## Alternative setup options

While the nRF52840 dongle provides an easy-to-use solution, other alternatives are available. However, keep in mind that these methods may vary depending on your operating system and might require additional development to ensure full compatibility.

1. **Linux HCI Interface**: This interface enables the use of the Linux Host Controller Interface (HCI) for Bluetooth connectivity.
2. **Standard Bluetooth USB Subsystem**: This offers a universal interface for Bluetooth USB devices.
3. **HCI Controller via UART**: This method necessitates either a direct UART (Universal Asynchronous Receiver-Transmitter) connection or the use of a third-party UART-to-USB adapter.

## Run example

Simple LE Bluetooth scanner:

```
npx ts-node examples/le-scanner.ts
```

## Further reading

- Getting Started Guide [GettingStarted.md](docs/GettingStarted.md)
- Advertising and scanning using Coded PHY [CodedPHY.md](docs/CodedPHY.md)
- Build HCI firmware [ZephyrHciController.md](docs/ZephyrHciController.md).
