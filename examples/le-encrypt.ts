import { Utils } from './utils/Utils';

(async () => {
  const adapter = await Utils.createHciAdapter();
  const hci = adapter.Hci;

  const key = Buffer.from('0123456789ABCDEF');
  const data = Buffer.from('0123456789ABCDEF');

  const result = await hci.leEncrypt(key, data);
  console.log(`Encrypted:`, result);

  // NOTE: command not implemented on the controller:
  // hci.on('LeReadLocalP256PublicKeyComplete', (status, event) => {
  //   console.log('LeReadLocalP256PublicKeyComplete', status, event);
  // });
  // await hci.leReadLocalP256PublicKey();
  // hci.on('LeGenerateDhKeyComplete', (status, event) => {
  //   console.log('LeGenerateDhKeyComplete', status, event);
  // });
  // await hci.leGenerateDhKeyV1({ publicKey: Buffer.alloc(64) });

  await adapter.close();

  process.exit(0);
})();
