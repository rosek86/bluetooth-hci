process.env.BLUETOOTH_HCI_SOCKET_FACTORY = '1';
import { bluetoothHciSocketFactory, BluetoothHciSocket } from '@rosek86/bluetooth-hci-socket';

import { SerialPort, SerialPortOpenOptions } from 'serialport';
import { PortInfo } from '@serialport/bindings-interface';
import { AutoDetectTypes } from '@serialport/bindings-cpp';

import { EventEmitter } from 'events';
import { Hci } from '../../src/hci/Hci';
import { H4 } from '../../src/transport/H4';
import { delay } from '../../src/utils/Utils';

export interface AdapterSerialParams {
  type: 'serial';
  serial: Omit<SerialPortOpenOptions<AutoDetectTypes>, 'path'> & { path: string | null };
}

export interface AdapterUsbParams {
  type: 'usb';
  usb: {
    devId?: number;
    vid: number;
    pid: number;
    bus?: number;
    address?: number;
  };
}

export interface AdapterNativeHciParams {
  type: 'hci';
  hci: {
    devId?: number;
  }
}

export type AdapterParams = AdapterSerialParams | AdapterUsbParams | AdapterNativeHciParams;

export interface HciDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  write(data: Buffer): void;
  on(evt: 'data', listener: (data: Buffer) => void): void;
  on(evt: 'error', listener: (data: NodeJS.ErrnoException) => void): void;
}

export class SerialHciDevice implements HciDevice {
  private port: SerialPort;
  constructor(options: SerialPortOpenOptions<AutoDetectTypes>) {
    options.autoOpen = false;
    options.parity = options.parity ?? 'none';
    options.rtscts = options.rtscts ?? true;
    options.baudRate = options.baudRate ?? 1_000_000;
    options.dataBits = options.dataBits ?? 8;
    options.stopBits = options.stopBits ?? 1;
    this.port = new SerialPort(options);
  }

  async open() {
    await new Promise<void>((resolve,  reject) => {
      this.port.once('open', () => resolve());
      this.port.open((err) => reject(err));
    });
  }

  async close() {
    await new Promise<void>((resolve,  reject) => {
      this.port.close((err) => err ? reject(err) : resolve());
    });
  }

  write(data: Buffer): void {
    this.port.write(data);
  }

  on(evt: 'data', listener: (data: Buffer) => void): void;
  on(evt: 'error', listener: (data: NodeJS.ErrnoException) => void): void;
  on(evt: any, listener: (data: any) => void): void {
    this.port.on(evt, listener);
  }
}

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
    console.log(this.devId);
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
  public on(evt: any, listener: (data: any) => void): void {
    this.port.on(evt, listener);
  }
}

export class HciAdapter extends EventEmitter {
  private readonly hci: Hci;
  private readonly h4: H4;

  constructor(private device: HciDevice) {
    super();

    this.hci = new Hci({
      send: (packetType, data) => {
        const packet = Buffer.concat([Buffer.from([packetType]), data, Buffer.from([0])]);
        device.write(packet);
      },
    });

    this.h4 = new H4();

    device.on('data', (data) => {
      let result = this.h4.parse(data);
      do {
        if (result) {
          this.hci.onData(result.type, result.packet);
          result = this.h4.parse(Buffer.alloc(0));
        }
      } while (result);
    });

    device.on('error', (err) => this.emit('error', err));
  }

  public async open() {
    await this.device.open();
  }

  public async close() {
    await this.device.close();
  }

  public write(data: Buffer) {
    this.device.write(data);
  }

  public get Hci(): Hci {
    return this.hci;
  }
}

export abstract class HciAdapterFactory {

  public static async create(params: AdapterParams): Promise<HciAdapter> {
    const device = await this.createDevice(params);
    return new HciAdapter(device);
  }

  private static async createDevice(params: AdapterParams): Promise<HciDevice> {
    if (params.type === 'serial') {
      const serial = params.serial;
      if (serial.path === null) {
        serial.path = (await this.findHciSerialPort()).path;
      }
      return new SerialHciDevice({ ...serial, path: serial.path });
    }
    if (params.type === 'usb') {
      return new UsbHciSocket(params.usb.devId ?? 0, params.usb);
    }
    if (params.type === 'hci') {
      return new NativeHciSocket(params.hci.devId ?? 0);
    }
    throw new Error('Unknown adapter interface');
  }

  public static async findHciSerialPort(): Promise<PortInfo> {
    const portInfos = await SerialPort.list();

    const hciPortInfos = portInfos.filter((port) => {
      if (port.manufacturer === 'SEGGER') {
        return true;
      }
      // Zephyr HCI UART
      if (port.vendorId === '2fe3' && port.productId === '0100') {
        return true;
      }
      return false;
    });

    if (hciPortInfos.length === 0) {
      throw new Error(`Cannot find appropriate port`);
    }

    return hciPortInfos[0];
  }
}
