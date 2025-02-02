import { HciAdapter, createHciSerial } from "../src/index.ts";

(async () => {
  const adapter = new HciAdapter(await createHciSerial());
  await adapter.open();
  console.log("Random:", await adapter.Hci.leRand());
  await adapter.close();
})();
