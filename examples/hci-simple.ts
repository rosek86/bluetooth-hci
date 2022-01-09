process.env.BLUETOOTH_HCI_SOCKET_FACTORY = '1';
import { bluetoothHciSocketFactory } from '@rosek86/bluetooth-hci-socket';
// import BluetoothHciSocket from '@rosek86/bluetooth-hci-socket';

import { Hci } from '../src/hci/Hci';
import { H4 } from '../src/transport/H4';
import { delay } from '../src/utils/Utils';

(async () => {
  const port = bluetoothHciSocketFactory('native');
  // const port = new BluetoothHciSocket();

  port.bindRaw(0);
  port.start();

  while (port.isDevUp() === false) {
    await delay(1000);
  }

  port.setFilter(Buffer.from('1600000020c10800000000400000', 'hex'));

  const hci = new Hci({
    send: (packetType, data) => {
      port.write(Buffer.from([packetType, ...data]));
    },
  });

  const h4 = new H4();

  port.on('data', (data) => {
    let result = h4.parse(data);
    do {
      if (result) {
        hci.onData(result.type, result.packet);
        result = h4.parse(Buffer.alloc(0));
      }
    } while (result);
  });

  const commands = await hci.readLocalSupportedCommands();
  console.log(commands);
})();
