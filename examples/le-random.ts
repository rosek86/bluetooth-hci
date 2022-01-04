import { Utils } from './utils/Utils';

(async () => {
  const adapter = await Utils.createHciAdapter();
  const hci = adapter.Hci;

  const random = await hci.leRand();
  console.log(`Random:`, random);

  await adapter.close();

  process.exit(0);
})();
