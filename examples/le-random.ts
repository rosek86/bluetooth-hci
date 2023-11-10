import { HciAdapterUtils } from '../src/utils/HciAdapterUtils';

(async () => {
  const adapter = await HciAdapterUtils.createHciAdapter();
  console.log('Random:', await adapter.Hci.leRand());
  await adapter.close();
  process.exit(0);
})();
