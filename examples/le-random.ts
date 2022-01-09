import { Utils } from './utils/Utils';

(async () => {
  const adapter = await Utils.createHciAdapter();
  console.log('Random:', await adapter.Hci.leRand());
  await adapter.close();
  process.exit(0);
})();
