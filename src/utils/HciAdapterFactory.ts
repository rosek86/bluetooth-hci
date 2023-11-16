process.env.BLUETOOTH_HCI_SOCKET_FACTORY = '1';
import { bluetoothHciSocketFactory, BluetoothHciSocket } from '@rosek86/bluetooth-hci-socket';

import { SerialPortOpenOptions } from 'serialport';
import { AutoDetectTypes } from '@serialport/bindings-cpp';

import { delay } from './Utils';
import { HciAdapter, HciDevice } from './HciAdapter';
import { createHciSerial } from './SerialHciDevice';

export interface AdapterSerialParams {
  type: 'serial';
  deviceId: number;
  serial: Partial<SerialPortOpenOptions<AutoDetectTypes>>;
}

export interface AdapterUsbParams {
  type: 'usb';
  deviceId: number;
  usb: {
    vid: number;
    pid: number;
    bus?: number;
    address?: number;
  };
}

export interface AdapterNativeHciParams {
  type: 'hci';
  deviceId: number;
}

export type AdapterParams = AdapterSerialParams | AdapterUsbParams | AdapterNativeHciParams;

export class UsbHciSocket implements HciDevice {
  private port: BluetoothHciSocket;

  constructor(private devId: number, private usbParams: AdapterUsbParams['usb']) {
    this.port = bluetoothHciSocketFactory('usb');
  }

  public async open() {
    await this.port.bindRaw(this.devId, { usb: this.usbParams });
    this.port.start();
  }

  public async close() {
    this.port.stop();
    this.port.removeAllListeners('data');
    this.port.removeAllListeners('error');
  }

  public write(data: Buffer): void {
    this.port.write(data);
  }

  public on(evt: 'data', listener: (data: Buffer) => void): void;
  public on(evt: 'error', listener: (data: NodeJS.ErrnoException) => void): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public on(evt: any, listener: (data: any) => void): void {
    this.port.on(evt, listener);
  }
}

export class NativeHciSocket implements HciDevice {
  private port: BluetoothHciSocket;

  constructor(private devId: number) {
    this.port = bluetoothHciSocketFactory('native');
  }

  public async open() {
    await this.port.bindRaw(this.devId);
    this.port.start();

    while (this.port.isDevUp() === false) {
      await delay(1000);
    }

    this.port.setFilter(Buffer.from('1600000020c10800000000400000', 'hex'));
  }

  public async close() {
    this.port.stop();
    this.port.removeAllListeners('data');
    this.port.removeAllListeners('error');
  }

  public write(data: Buffer): void {
    this.port.write(data);
  }

  public on(evt: 'data', listener: (data: Buffer) => void): void;
  public on(evt: 'error', listener: (data: NodeJS.ErrnoException) => void): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public on(evt: any, listener: (data: any) => void): void {
    this.port.on(evt, listener);
  }
}

export abstract class HciAdapterFactory {

  public static async create(params: AdapterParams): Promise<HciAdapter> {
    return new HciAdapter(await this.createDevice(params));
  }

  private static async createDevice(params: AdapterParams): Promise<HciDevice> {
    if (params.type === 'serial') {
      return createHciSerial(params.deviceId, params.serial);
    }
    if (params.type === 'usb') {
      return new UsbHciSocket(params.deviceId, params.usb);
    }
    if (params.type === 'hci') {
      return new NativeHciSocket(params.deviceId);
    }
    throw new Error('Unknown adapter interface');
  }
}
