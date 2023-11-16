import { DisconnectionCompleteEvent } from '../src/hci/HciEvent';
import { GapAdvertReport, GapConnectEvent } from '../src/gap/GapCentral';
import { NbleGapCentral } from '../src/nble/NbleGapCentral';
import { GattClient } from '../src/gatt/GattClient';
import { HciAdapter } from '../src/utils/HciAdapter';
import { printProfile } from '../src/utils/Profile';
import { createHciSerial } from '../src/utils/SerialHciDevice';
import { delay } from '../src/utils/Utils';

class App extends NbleGapCentral {
  private state: 'idle' | 'connecting' | 'connected' = 'idle';

  constructor(adapter: HciAdapter) {
    super(adapter);
  }

  protected async onAdvert(report: GapAdvertReport): Promise<void> {
    try {
      if (report.connectableAdvertising === false) {
        // Skip non-connectable devices
        return;
      }

      const name = report.data.completeLocalName;
      if (name !== 'Nordic_LBS') { return; }

      // Prevent multiple connections requests
      if (this.state !== 'idle') { return; }
      this.state = 'connecting';

      // Connect to device with timeout
      await this.connect(report.address, { connectionTimeoutMs: 2000 });
      console.log(`Connecting to ${report.address.toString()} (${name}) at RSSI ${report.rssi} dBm...`);

    } catch (e) {
      console.log(`Error while connecting to ${report.address.toString()}`, e);
      this.state = 'idle';
    }
  }

  protected async onConnected(event: GapConnectEvent): Promise<void> {
    // Device connected, discovering services
    this.state = 'connected';
    console.log(`Connected to ${event.address.toString()}`);
    console.log(`Discovering services on ${event.address.toString()}...`);
  }

  protected async onServicesDiscovered(event: GapConnectEvent, gatt: GattClient): Promise<void> {
    try {
      console.log('Discovered services on', event.address.toString());

      printProfile(gatt.Profile);

      const characteristic = gatt.findCharacteristicByUuids({
        serviceUuid: '000015231212efde1523785feabcd123',
        descriptorUuid: '000015241212efde1523785feabcd123',
      });

      if (characteristic) {
        await gatt.startCharacteristicsNotifications(characteristic, false);

        console.log('Waiting for button press...');
        gatt.on('GattNotification', (event) => {
          if (event.descriptor.uuid !== '000015241212efde1523785feabcd123') {
            return;
          }
          const state = event.attributeValue[0];
          console.log(state ? 'Button pressed' : 'Button released');
        });

        for (let i = 0; i < 60; i++) {
          // console.log(await gatt.read({ handle: characteristic.valueHandle }));
          await delay(1000);
        }
      }
    } catch (e) {
      console.log(e);
    } finally {
      console.log('Disconnecting...');
      await this.disconnect(event.connectionHandle);
    }
  }

  protected async onDisconnected(reason: DisconnectionCompleteEvent): Promise<void> {
    console.log('Disconnected', reason.connectionHandle, reason.reason);
    this.state = 'idle';
  }

  protected async onConnectionCancelled(): Promise<void> {
    console.log('Connection cancelled (timeout)');
    this.state = 'idle';
  }
}

(async () => {
  try {
    const adapter = new HciAdapter(await createHciSerial());
    await adapter.open();
    await (new App(adapter)).start();
  } catch (e) {
    console.log(e);
  }
})();
