import { HciAdapter, LeDhKeyV2KeyType, createHciSerial } from '../src';

(async () => {
  const adapter = new HciAdapter(await createHciSerial());
  await adapter.open();
  const hci = adapter.Hci;

  const commands = await hci.readLocalSupportedCommands();

  await hci.setEventMask({ leMeta: true });
  await hci.leSetEventMask({
    generateDhKeyComplete: true,
    readLocalP256PublicKeyComplete: true,
  });

  hci.on('LeGenerateDhKeyComplete', (status, event) => {
    console.log('LeGenerateDhKeyComplete', status, event);
  });
  hci.on('LeReadLocalP256PublicKeyComplete', (status, event) => {
    console.log('LeReadLocalP256PublicKeyComplete', status, event);
  });

  if (commands.isSupported('leEncrypt')) {
    const key = Buffer.from('0123456789ABCDEF');
    const data = Buffer.from('0123456789ABCDEF');
    const result = await hci.leEncrypt(key, data);
    console.log(`Encrypted:`, result);
  }

  if (commands.isSupported('leGenerateDhKeyV2')) {
    await hci.leGenerateDhKeyV2({
      publicKey: Buffer.alloc(64),
      keyType: LeDhKeyV2KeyType.UseDebugPrivateKey,
    });
  }

  if (commands.isSupported('leReadLocalP256PublicKey')) {
    await hci.leReadLocalP256PublicKey();
  }
})();
