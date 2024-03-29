# bluetooth-hci

NOTE: This is the initial version of the library, with basic functionalities such as advertising, scanning and central connection are operational, however further development is required to bring this library to a production-ready level.

The library implements a Bluetooth 5 HCI host, focusing mainly on Bluetooth Low Energy (LE).

## Getting started

The simplest way to use this library is by employing the **nRF52840 Dongle**, **nRF52840 DK**, or **nRF5340 DK**. You can find a detailed guide on the getting started process [here](docs/GettingStarted.md).

```
npm install bluetooth-hci
```

## Examples

Additional examples are available in the [examples](examples) directory.

### Central connection (Nordic_LBS example)

```ts
import {
  createHciSerial,
  HciAdapter,
  DisconnectionCompleteEvent,
  GapAdvertReport,
  GapConnectEvent,
  GattClient,
  NbleGapCentral,
  printProfile,
  HciError,
  HciErrorErrno,
  LeConnectionUpdate,
  delay,
} from "bluetooth-hci";

class App extends NbleGapCentral {
  constructor(adapter: HciAdapter) {
    super(adapter);

    this.on("error", (err) => console.log("NbleGapCentral Error:", err));
  }

  protected async onAdvert(report: GapAdvertReport): Promise<void> {
    try {
      if (report.connectableAdvertising === false) {
        // Skip non-connectable devices
        return;
      }

      const name = report.data?.completeLocalName;
      if (name !== "Nordic_LBS") {
        return;
      }

      // Connect to device with timeout
      await this.connect({ peerAddress: report.address, timeoutMs: 2000 });

      console.log(`Connecting to ${report.address.toString()} (${name}) at RSSI ${report.rssi} dBm...`);
    } catch (e) {
      if (e instanceof HciError && e.errno === HciErrorErrno.CommandDisallowed) {
        return; // ignore
      }
      if (e instanceof HciError && e.errno === HciErrorErrno.ConnectionExists) {
        return; // ignore
      }
      console.log(`Error while connecting to ${report.address.toString()}`, e);
    }
  }

  protected async onConnected(event: GapConnectEvent, gatt: GattClient): Promise<void> {
    try {
      console.log(`Connected to ${event.address.toString()}`);

      const connectionParameters: LeConnectionUpdate = {
        connectionHandle: event.connectionHandle,
        connectionIntervalMinMs: event.connectionParams.connectionIntervalMs,
        connectionIntervalMaxMs: event.connectionParams.connectionIntervalMs,
        connectionLatency: event.connectionParams.connectionLatency,
        supervisionTimeoutMs: event.connectionParams.supervisionTimeoutMs,
        minCeLengthMs: 2.5,
        maxCeLengthMs: 3.75,
      };

      // Update connection parameters to speed up discovery
      console.log(`Updating connection parameters...`);
      console.log(
        await this.gap.connectionUpdate({
          ...connectionParameters,
          connectionIntervalMinMs: 7.5,
          connectionIntervalMaxMs: 7.5,
        }),
      );

      console.log(`Discovering services on ${event.address.toString()}...`);
      const profile = await gatt.discover();
      this.saveProfile(event.address, profile); // cache profile
      console.log("Discovered services on", event.address.toString());

      printProfile(gatt.Profile);

      // Find button characteristic
      const characteristic = gatt.findCharacteristicByUuids({
        serviceUuid: "000015231212efde1523785feabcd123",
        characteristicUuid: "000015241212efde1523785feabcd123",
      });

      if (!characteristic) {
        throw new Error("Button characteristic not found");
      }

      console.log("Reading initial button state...");
      const initialButtonState = await gatt.read(characteristic);
      console.log(`Initial button state: ${initialButtonState[0] ? "pressed" : "released"}`);

      console.log("Waiting for button press...");

      await gatt.startCharacteristicsNotifications(characteristic, false);
      gatt.on("GattNotification", (event) => {
        if (event.descriptor.uuid !== "000015241212efde1523785feabcd123") {
          return;
        }
        const state = event.attributeValue[0];
        console.log(state ? "Button pressed" : "Button released");
      });

      await delay(30_000);
    } catch (e) {
      if (e instanceof HciError && e.errno === HciErrorErrno.ConnectionTimeout) {
        return; // ignore
      }
      console.log(e);
    } finally {
      console.log("Disconnecting...");
      await this.disconnect(event.connectionHandle).catch(() => {});
    }
  }

  protected async onDisconnected(reason: DisconnectionCompleteEvent): Promise<void> {
    console.log("Disconnected", reason.connectionHandle, reason.reason);
  }

  protected async onConnectionCancelled(): Promise<void> {
    console.log("Connection cancelled (timeout)");
  }
}

(async () => {
  try {
    const adapter = new HciAdapter(await createHciSerial());
    await adapter.open();
    await new App(adapter).start();
  } catch (e) {
    const err = e as Error;
    console.log("le-central", err.message);
  }
})();
```

### Simple scanning

```ts
import { createHciSerial, HciAdapter } from "bluetooth-hci";
import { AdvData } from "bluetooth-hci";

import { LeOwnAddressType, LeScanningFilterPolicy, LeScanType, LeScanFilterDuplicates } from "bluetooth-hci";

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

    adapter.Hci.on("LeExtendedAdvertisingReport", (report) => {
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
  LeScanResponseDataOperation,
} from "bluetooth-hci";
import { Address, AdvData } from "bluetooth-hci";
import { createHciSerial, HciAdapter } from "bluetooth-hci";

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
      completeLocalName: "Bluetooth HCI",
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
      completeListOf16bitServiceClassUuids: ["1826", "1818"],
      completeListOf128bitServiceClassUuids: ["669aa6050c08969ee21186ad5062675f"],
      serviceData16bitUuid: [
        {
          uuid: "1826",
          data: Buffer.from([1, 0, 32]),
        },
      ],
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

    console.log("advertising...");
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
```

## Alternative setup options

While the Nordic Semiconductor boards provide an easy-to-use solution, other alternatives are available. However, keep in mind that these methods may vary depending on your operating system and might require additional development to ensure full compatibility.

1. **Linux HCI Interface**: This interface enables the use of the Linux Host Controller Interface (HCI) for Bluetooth connectivity.
2. **Standard Bluetooth USB Subsystem**: This offers a universal interface for Bluetooth USB devices.
3. **HCI Controller via UART**: This method necessitates either a direct UART (Universal Asynchronous Receiver-Transmitter) connection or the use of a third-party UART-to-USB adapter.

## Run example

Simple Bluetooth LE scanner:

```
npm run build
node lib/examples/le-scanner.js
```

## Further reading

- Advertising and scanning using Coded PHY [CodedPHY.md](docs/CodedPHY.md)
- Build Zephyr HCI controller firmware [ZephyrHciController.md](docs/ZephyrHciController.md)
