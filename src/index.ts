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
    const features = await hci.readLocalSupportedFeatures();

    console.log(features);
  } catch (err) {
    console.log(err);
  }
})();
