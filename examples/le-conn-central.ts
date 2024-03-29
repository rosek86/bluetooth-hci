import {
  LePhy,
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates,
  GapCentral,
  HciAdapter,
  createHciSerial,
} from "../src";

(async () => {
  try {
    const adapter = new HciAdapter(await createHciSerial());
    await adapter.open();
    await adapter.defaultAdapterSetup();

    const hci = adapter.Hci;
    await hci.leSetDefaultPhy({ txPhys: LePhy.Phy1M, rxPhys: LePhy.Phy1M });

    const gap = new GapCentral(hci);

    await gap.init();
    await gap.setScanParameters({
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.All,
      scanningPhy: {
        Phy1M: {
          type: LeScanType.Active,
          intervalMs: 11.25,
          windowMs: 11.25,
        },
      },
    });
    await gap.startScanning({ filterDuplicates: LeScanFilterDuplicates.Enabled });

    gap.on("GapLeScanState", (scanning) => {
      console.log("scanning", scanning);
    });

    let connecting = false;
    gap.on("GapLeAdvReport", async (report) => {
      if (connecting) {
        return;
      }
      if (report.address.toString() !== "AA:BB:CC:DD:EE:FF") {
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
        event.leRemoteFeatures.toString(),
      );

      const att = gap.getAtt(event.connectionHandle);

      const rssi = await hci.readRssi(event.connectionHandle);
      console.log(`RSSI: ${rssi} dBm`);

      const powerLevels = await gap.readTransmitPowerLevels(event.connectionHandle);
      console.log(`Power Level: ${powerLevels.current}/${powerLevels.maximum} dBm`);

      const phy = await hci.leReadPhy(event.connectionHandle);
      console.log("PHY:", phy);

      const dataLength = await hci.leSetDataLengthAwait(event.connectionHandle, {
        txOctets: 200,
        txTime: 2000,
      });
      console.log("data-length", dataLength);

      const mtu = await att.exchangeMtuReq({ mtu: 200 });
      console.log("mtu", mtu);

      const info = await att.findInformationReq({
        startingHandle: 0x0001,
        endingHandle: 0xffff,
      });
      console.log(info);

      const connParams = await gap.connectionUpdate({
        connectionHandle: event.connectionHandle,
        connectionIntervalMinMs: 40,
        connectionIntervalMaxMs: 90,
        connectionLatency: 0,
        supervisionTimeoutMs: 5000,
        minCeLengthMs: 2.5,
        maxCeLengthMs: 3.75,
      });
      console.log(connParams);

      setTimeout(async () => {
        await hci.disconnect(event.connectionHandle);
      }, 2000);
    });

    gap.on("GapDisconnected", (reason) => {
      console.log("disconnected", reason);
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
