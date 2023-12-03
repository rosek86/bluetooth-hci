import { createHciSerial, HciAdapter } from '../src';
import { GapAdvertReport, GapConnectEvent } from '../src';
import { GattClient } from '../src';
import { NbleGapCentral } from '../src';
import { DisconnectionCompleteEvent, LeConnectionUpdate } from '../src';
import { delay } from '../src';

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
      await this.connect({ peerAddress: report.address, timeoutMs: 2000 });
      console.log(`Connecting to ${report.address.toString()} (${name}) at RSSI ${report.rssi} dBm...`);

    } catch (e) {
      console.log(`Error while connecting to ${report.address.toString()}`, e);
      this.state = 'idle';
    }
  }

  protected async onConnected(event: GapConnectEvent, gatt: GattClient): Promise<void> {
    try {
      this.state = 'connected';
      console.log(`Connected to ${event.address.toString()}`);

      const connectionParameters: LeConnectionUpdate = {
        connectionHandle: event.connectionHandle,
        connectionIntervalMinMs: event.connectionParams.connectionIntervalMs,
        connectionIntervalMaxMs: event.connectionParams.connectionIntervalMs,
        connectionLatency: event.connectionParams.connectionLatency,
        supervisionTimeoutMs: event.connectionParams.supervisionTimeoutMs,
        minCeLengthMs: 2.5,
        maxCeLengthMs: 3.75,
      };

      // Update connection parameters to speed up discovery
      await this.gap.connectionUpdate({
        ...connectionParameters,
        connectionIntervalMinMs: 7.5,
        connectionIntervalMaxMs: 7.5,
      });

      console.log(`Discovering services on ${event.address.toString()}...`);
      const profile = await gatt.discover();
      this.saveProfile(event.address, profile); // cache profile
      console.log('Discovered services on', event.address.toString());

      this.printProfile(gatt.Profile);

      // Update connection parameters to decrease power consumption
      console.log(
        await this.gap.connectionUpdate({
          ...connectionParameters,
          connectionIntervalMinMs: 100,
          connectionIntervalMaxMs: 100,
        })
      );

      // Find button characteristic
      const characteristic = gatt.findCharacteristicByUuids({
        serviceUuid: '000015231212efde1523785feabcd123',
        characteristicUuid: '000015241212efde1523785feabcd123',
      });

      if (!characteristic) {
        throw new Error('Button characteristic not found');
      }

      console.log('Reading initial button state...');
      const initialButtonState = await gatt.read(characteristic);
      console.log(`Initial button state: ${initialButtonState[0] ? 'pressed' : 'released'}`);

      console.log('Waiting for button press...');

      await gatt.startCharacteristicsNotifications(characteristic, false);
      gatt.on('GattNotification', (event) => {
        if (event.descriptor.uuid !== '000015241212efde1523785feabcd123') {
          return;
        }
        const state = event.attributeValue[0];
        console.log(state ? 'Button pressed' : 'Button released');
      });

      await delay(30_000);
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

createHciSerial().then(async (serial) => {
  const adapter = new HciAdapter(serial);
  await adapter.open();

  const app = new App(adapter);
  await app.start();
}).catch((e) => {
  console.log(e);
});
