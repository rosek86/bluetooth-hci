import { PcBleDriverJsAdapter } from "../src";
import { HciAdapter, createHciSerial } from "../src";

(async () => {
  const hciAdapter = new HciAdapter(await createHciSerial());
  await hciAdapter.open();

  const adapter = new PcBleDriverJsAdapter(hciAdapter);
  await adapter.open();

  await adapter.startScan({
    active: true,
    interval: 100,
    window: 100,
    timeout: 0,
  });

  adapter.on("deviceDiscovered", (device) => {
    console.log(device);
  });
})();
