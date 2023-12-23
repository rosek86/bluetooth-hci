import { HciAdapter, createHciSerial } from "../src";

(async () => {
  const adapter = new HciAdapter(await createHciSerial());
  await adapter.open();
  console.log("Random:", await adapter.Hci.leRand());
  await adapter.close();
})();
