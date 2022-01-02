process.env.BLUETOOTH_HCI_SOCKET_FORCE_USB = '1';
import BluetoothHciSocket from '@rosek86/bluetooth-hci-socket';
import SerialPort from 'serialport';

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

export type AdapterParams = AdapterSerialParams | AdapterUsbParams;

export interface Adapter {
  write: (data: Buffer) => void;
  on(evt: 'data', listener: (data: Buffer) => void): void;
  on(evt: 'error', listener: (data: NodeJS.ErrnoException) => void): void;
}

export class SerialAdapter implements Adapter {
  constructor(private port: SerialPort) {
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

export class UsbAdapter implements Adapter {
  constructor(private port: BluetoothHciSocket) {
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

export abstract class HciAdapterFactory {

  public static async create(params: AdapterParams): Promise<Adapter> {
    if (params.type === 'serial') {
      const portInfo = await this.findHciSerialPort();
      const port = await this.openHciSerialPort(portInfo, params.serial);
      return new SerialAdapter(port);
    }
    if (params.type === 'usb') {
      const deviceId = params.usb.devId ?? 0;
      const device = await this.openHciUsbDevice(deviceId, params.usb);
      return new UsbAdapter(device);
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

  private static async openHciSerialPort(portInfo: SerialPort.PortInfo, options: SerialPort.OpenOptions): Promise<SerialPort> {
    const port = new SerialPort(portInfo.path, options);

    const waitOpen = new Promise<SerialPort>((resolve,  reject) => {
      port.on('open', () => resolve(port));
      port.open((err) => reject(err));
    });

    return await waitOpen;
  }

  public static async openHciUsbDevice(usbDevId: number, usbParams: AdapterUsbParams['usb']) {
    const bluetoothHciSocket = new BluetoothHciSocket();
    bluetoothHciSocket.bindRaw(usbDevId, { usb: usbParams });
    bluetoothHciSocket.start();
    return bluetoothHciSocket;
  }
}
