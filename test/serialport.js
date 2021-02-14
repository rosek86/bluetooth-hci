const SerialPort = require('serialport');

const H4 = require('../lib/H4').default;
const Hci = require('../lib/Hci').default;
const Address = require('../lib/Address').default;

(async () => {
  try {
    const portInfo = await findHciPort();
    const port = await openHciPort(portInfo);

    const hci = new Hci({
      send: (packetType, data) => {
        port.write([packetType, ...data]);
      },
    });

    const h4 = new H4();
    port.on('data', (data) => {
      let result = h4.parse(data);
      do {
        if (result) {
          hci.onData(result.type, result.packet);
          result = h4.parse(Buffer.allocUnsafe(0));
        }
      } while (result);
    });
    port.on('error', (err) => {
      console.log(err);
    });

    await hci.reset();

    const localFeatures = await hci.readLocalSupportedFeatures();
    console.log(localFeatures);

    const localVersion = await hci.readLocalVersionInformation();
    console.log(localVersion);

    const bdAddress = new Address(await hci.readBdAddr());
    console.log(bdAddress.toString());

    const leBufferSize = await hci.leReadBufferSize();
    console.log(leBufferSize);

    const leFeatures = await hci.leReadSupportedFeatures();
    console.log(leFeatures);

    const leStates = await hci.leReadSupportedStates();
    console.log(leStates);

    const localCommands = await hci.readLocalSupportedCommands();
    console.log(localCommands);

    await hci.setEventMask();

    // await hci.leSetEventMask();

    console.log('end');

  } catch (err) {
    console.log(err.message);
  } finally {
    // port.close();
  }
})();

async function findHciPort() {
  const portInfos = await SerialPort.list();

  const hciPortInfos = portInfos.filter(
    (port) => port.manufacturer === 'SEGGER'
  );

  if (hciPortInfos.length === 0) {
    throw new Error(`Cannot find appropriate port`);
  }

  return hciPortInfos[0];
}

async function openHciPort(portInfo) {
  const port = new SerialPort(portInfo.path, {
    autoOpen: false,
    baudRate: 1000000,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    rtscts: true,
  });

  const waitOpen = new Promise((resolve,  reject) => {
    port.on('open', () => resolve());
    port.open((err) => reject(err));
  });
  await waitOpen;

  return port;
}
