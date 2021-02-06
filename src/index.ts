import Hci from './Hci';

let sendEvent: ((_: Buffer) => void) | null = null;

(async () => {
  try {
    const hci = new Hci({
      send: (data) => console.log(data.toString('hex')),
      setEventHandler: (handler) => sendEvent = handler,
    });

    setImmediate(() => sendEvent!(Buffer.from('0e0401030c00', 'hex')));
    await hci.reset();

    setImmediate(() => sendEvent!(Buffer.from('0e0c010310000000000060000000', 'hex')));
    console.log(await hci.readLocalSupportedFeatures());

    setImmediate(() => sendEvent!(Buffer.from('0e0c010110000b7b110b59007b11', 'hex')));
    console.log(await hci.readLocalVersionInformation());

    setImmediate(() => sendEvent!(Buffer.from('0e0a01091000AABBCCDDEEFF', 'hex')));
    console.log((await hci.readBdAddr()).toString(16));

    setImmediate(() => sendEvent!(Buffer.from('0e07010220001b0003', 'hex')));
    console.log(await hci.leReadBufferSize());

    setImmediate(() => sendEvent!(Buffer.from('0e0c01032000f559000000007b11', 'hex')));
    console.log(await hci.leReadSupportedFeatures());

    setImmediate(() => sendEvent!(Buffer.from('0e0c011c2000ff590000ff007b11', 'hex')));
    console.log((await hci.leReadSupportedStates()).toString());

    setImmediate(() => sendEvent!(
      Buffer.from(
        '0e44010210002000800000c000000000' +
        'e40000002822000000000000040000f7' +
        'ffff7f00000030c079feffe380040000' +
        '00000000000000000000000000000000' +
        '000000000000', 'hex'
      )
    ));
    console.log(await hci.readLocalSupportedCommands());

    setImmediate(() => sendEvent!(Buffer.from('0e0401010c00', 'hex')));
    await hci.setEventMask();

    setImmediate(() => sendEvent!(Buffer.from('0e0401012000', 'hex')));
    await hci.leSetEventMask();

    setImmediate(() => sendEvent!(Buffer.from('0e05010f200008', 'hex')));
    console.log(`Whitelist size: ${await hci.leReadWhiteListSize()}`);

    setImmediate(() => sendEvent!(Buffer.from('0e0401102000', 'hex')));
    await hci.leClearWhiteList();

    setImmediate(() => sendEvent!(Buffer.from('0e05012a200008', 'hex')));
    console.log(`Resolving List size: ${await hci.leReadResolvingListSize()}`);

    setImmediate(() => sendEvent!(Buffer.from('0e0401292000', 'hex')));
    await hci.leClearResolvingList();

    setImmediate(() => sendEvent!(Buffer.from('0e0c012f2000fb00900afb00900a', 'hex')));
    const maxDataLength = await hci.leReadMaximumDataLength();
    console.log(`Max data length: ${JSON.stringify(maxDataLength)}`);

    console.log('done');
  } catch (err) {
    console.log(err);
  }
})();
