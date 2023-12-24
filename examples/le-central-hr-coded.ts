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
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates,
} from "../src";

class App extends NbleGapCentral {
  constructor(adapter: HciAdapter) {
    super(adapter, {
      autoScan: true,
      autoScanOptions: {
        scanWhenConnected: true,
        parameters: {
          ownAddressType: LeOwnAddressType.RandomDeviceAddress,
          scanningFilterPolicy: LeScanningFilterPolicy.All,
          scanningPhy: {
            PhyCoded: {
              type: LeScanType.Active,
              intervalMs: 100,
              windowMs: 100,
            },
          },
        },
        start: {
          filterDuplicates: LeScanFilterDuplicates.Disabled,
        },
      },
    });

    this.on("error", (err) => console.log("NbleGapCentral Error:", err));
  }

  protected async onAdvert(report: GapAdvertReport): Promise<void> {
    try {
      if (report.connectableAdvertising === false) {
        // Skip non-connectable devices
        return;
      }

      const name = report.data.completeLocalName;
      if (name !== "Nordic_HRS") {
        return;
      }

      // Connect to device with timeout
      await this.connect({
        peerAddress: report.address,
        timeoutMs: 2000,
        initiatingPhy: {
          PhyCoded: {
            scanIntervalMs: 100,
            scanWindowMs: 100,
            connectionIntervalMinMs: 7.5,
            connectionIntervalMaxMs: 100,
            connectionLatency: 0,
            supervisionTimeoutMs: 4000,
            minCeLengthMs: 2.5,
            maxCeLengthMs: 3.75,
          },
        },
      });

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

      void gatt;
      console.log(event);

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
          connectionIntervalMaxMs: 20,
        }),
      );

      console.log(`Discovering services on ${event.address.toString()}...`);
      const profile = await gatt.discover();
      this.saveProfile(event.address, profile); // cache profile
      console.log("Discovered services on", event.address.toString());

      printProfile(gatt.Profile);

      // Find button characteristic
      const batteryLevel = gatt.findCharacteristicByUuids({
        serviceUuid: "180f",
        characteristicUuid: "2a19",
      });

      const hr = gatt.findCharacteristicByUuids({
        serviceUuid: "180d",
        characteristicUuid: "2a37",
      });

      if (!batteryLevel || !hr) {
        throw new Error("Button characteristic not found");
      }

      await gatt.startCharacteristicsNotifications(hr, false);
      await gatt.startCharacteristicsNotifications(batteryLevel, false);

      gatt.on("GattNotification", (event) => {
        if (event.descriptor.uuid === "2a19") {
          console.log(`battery level: ${event.attributeValue[0]}`);
        }
        if (event.descriptor.uuid === "2a37") {
          console.log(`heart rate: ${event.attributeValue[0]}`);
        }
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
