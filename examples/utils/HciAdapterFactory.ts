process.env.BLUETOOTH_HCI_SOCKET_FACTORY = '1';
import { bluetoothHciSocketFactory, BluetoothHciSocket } from '@rosek86/bluetooth-hci-socket';
import SerialPort from 'serialport';
import { EventEmitter } from 'stream';
import { Hci } from '../../src/hci/Hci';
import { H4 } from '../../src/transport/H4';
import { delay } from '../../src/utils/Utils';

export interface AdapterSerialParams {
  type: 'serial';
  serial: SerialPort.OpenOptions;
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
  constructor(path: string, options: SerialPort.OpenOptions) {
    options.autoOpen = false;
    this.port = new SerialPort(path, options);
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
    this.port.bindRaw(this.devId, { usb: this.usbParams });
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
    this.port.bindRaw(this.devId);
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

export class Adapter extends EventEmitter {
  private readonly hci: Hci;
  private readonly h4: H4;

  constructor(private device: HciDevice) {
    super();

    this.hci = new Hci({
      send: (packetType, data) => {
        device.write(Buffer.from([packetType, ...data]));
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

  public static async create(params: AdapterParams): Promise<Adapter> {
    const device = await this.createDevice(params);
    return new Adapter(device);
  }

  private static async createDevice(params: AdapterParams): Promise<HciDevice> {
    if (params.type === 'serial') {
      const portInfo = await this.findHciSerialPort();
      return new SerialHciDevice(portInfo.path, params.serial);
    }
    if (params.type === 'usb') {
      return new UsbHciSocket(params.usb.devId ?? 0, params.usb);
    }
    if (params.type === 'hci') {
      return new NativeHciSocket(params.hci.devId ?? 0);
    }
    throw new Error('Unknown adapter interface');
  }

  private static async findHciSerialPort(): Promise<SerialPort.PortInfo> {
    const portInfos = await SerialPort.list();

    const hciPortInfos = portInfos.filter(
      (port) => port.manufacturer === 'SEGGER'
    );

    if (hciPortInfos.length === 0) {
      throw new Error(`Cannot find appropriate port`);
    }

    return hciPortInfos[0];
  }
}
