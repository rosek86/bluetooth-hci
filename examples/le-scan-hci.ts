import { HciAdapter, createHciSerial, LeOwnAddressType, LeScanningFilterPolicy, LeScanType, AdvData } from "../src";

(async () => {
  try {
    const adapter = new HciAdapter(await createHciSerial());
    await adapter.open();
    await adapter.defaultAdapterSetup();

    await adapter.Hci.leSetScanParameters({
      type: LeScanType.Active,
      intervalMs: 1000,
      windowMs: 100,
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.All,
    });
    await adapter.Hci.leSetScanEnable(true, true);

    adapter.Hci.on("LeAdvertisingReport", (report) => {
      console.log(report, AdvData.parse(report.data ?? Buffer.alloc(0)));
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
