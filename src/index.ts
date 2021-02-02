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

  } catch (err) {
    console.log(err);
  }
})();
