import {
  HciAdapter,
  createHciSerial,
  GapCentral,
  GattClient,
  LeScanFilterDuplicates,
  amendProfileWithUuidNames,
  uuidInfo,
  GattService,
  GattCharacteristic,
} from "../src";

(async () => {
  try {
    const adapter = new HciAdapter(await createHciSerial());
    await adapter.open();
    await adapter.defaultAdapterSetup();

    const gap = new GapCentral(adapter.Hci);
    await gap.init();

    await gap.setScanParameters();
    await gap.startScanning({ filterDuplicates: LeScanFilterDuplicates.Enabled });
    console.log("scanning...");

    gap.on("GapLeScanState", (scanning) => {
      console.log("scanning", scanning);
    });

    let connecting = false;
    gap.on("GapLeAdvReport", async (report) => {
      if (connecting) {
        return;
      }
      if (report.data.completeLocalName) {
        console.log(report.address, report.data.completeLocalName, report.rssi, report.scanResponse);
      }
      if (report.data.completeLocalName !== "Zephyr Heartrate Sensor") {
        return;
      }

      connecting = true;
      console.log("connecting...");
      await gap.stopScanning();
      await gap.connect({ peerAddress: report.address });
    });

    gap.on("GapConnected", async (event) => {
      connecting = false;

      console.log(
        "connected",
        event.connectionHandle,
        event.connectionParams,
        event.versionInfo,
        adapter.manufacturerNameFromCode(event.versionInfo.manufacturerName),
        event.leRemoteFeatures.toString(),
      );

      const rssi = await adapter.Hci.readRssi(event.connectionHandle);
      console.log(`RSSI: ${rssi} dBm`);

      const gatt = new GattClient(gap.getAtt(event.connectionHandle));
      const profile = await gatt.discover();
      const profileAmended = amendProfileWithUuidNames(profile);

      console.log(JSON.stringify(profileAmended, null, 2));

      let hr: { service: GattService.AsObject; characteristic: GattCharacteristic.AsObject } | null = null;
      for (const service of Object.values(profileAmended.services ?? {})) {
        if (service.service.uuidInfo?.for !== "Heart Rate") {
          continue;
        }
        for (const characteristic of Object.values(service.characteristics ?? {})) {
          if (characteristic.characteristic.properties.notify === false) {
            continue;
          }
          for (const descriptor of Object.values(characteristic.descriptors ?? {})) {
            if (descriptor.descriptor.uuidInfo?.for !== "Heart Rate Measurement") {
              continue;
            }
            hr = { service: service.service, characteristic: characteristic.characteristic };
            break;
          }
          if (hr) {
            break;
          }
        }
        if (hr) {
          break;
        }
      }

      if (hr) {
        await gatt.startCharacteristicsNotifications(hr.characteristic, false);
        gatt.on("GattNotification", (event) => {
          const flags = event.attributeValue[0];
          const v16 = flags & 1;
          const value = v16 ? event.attributeValue.readUIntLE(1, 2) : event.attributeValue.readUIntLE(1, 1);
          console.log(`
            ${event.service.uuid}, ${uuidInfo(event.service.uuid)?.for}
            ${event.descriptor.uuid}, ${uuidInfo(event.descriptor.uuid)?.for}
            ${value} bpm
          `);
        });
      }

      setTimeout(async () => {
        await gap.disconnect(event.connectionHandle);
      }, 10_000);
    });

    gap.on("GapDisconnected", async (reason) => {
      connecting = false;
      console.log("DisconnectionComplete", reason);

      await gap.setScanParameters();
      await gap.startScanning({ filterDuplicates: LeScanFilterDuplicates.Enabled });
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
