import Debug from "debug";
import { SerialPort, SerialPortOpenOptions } from "serialport";
import { AutoDetectTypes } from "@serialport/bindings-cpp";

// https://github.com/serialport/bindings-interface/pull/32
// import { PortInfo } from '@serialport/bindings-interface';
interface PortInfo {
  path: string;
}

import { HciDevice } from "./HciAdapter.js";

const debug = Debug("bt-hci-uart");

export class SerialHciDevice implements HciDevice {
  private port: SerialPort;

  constructor(options: SerialPortOpenOptions<AutoDetectTypes>) {
    options.autoOpen = false;
    options.parity = options.parity ?? "none";
    options.rtscts = options.rtscts ?? true;
    options.baudRate = options.baudRate ?? 1_000_000;
    options.dataBits = options.dataBits ?? 8;
    options.stopBits = options.stopBits ?? 1;
    this.port = new SerialPort(options);
    this.port.on("error", (err) => debug(err));
    // this.port.on('data', (data) => debug(data.toString('hex')));
    this.port.on("close", () => debug("close"));
  }

  async open() {
    await new Promise<void>((resolve, reject) => {
      this.port.once("open", () => resolve());
      this.port.open((err) => reject(err));
    });
  }

  async close() {
    await new Promise<void>((resolve, reject) => {
      this.port.close((err) => (err ? reject(err) : resolve()));
    });
  }

  write(data: Buffer): void {
    this.port.write(data);
  }

  on(evt: "data", listener: (data: Buffer) => void): void;
  on(evt: "error", listener: (data: NodeJS.ErrnoException) => void): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(evt: any, listener: (data: any) => void): void {
    this.port.on(evt, listener);
  }

  public static async findSerial(deviceId: number = 0): Promise<PortInfo | null> {
    const portInfos = await SerialPort.list();

    const hciPortInfos = portInfos.filter((port) => {
      // Zephyr HCI UART
      if (port.vendorId === "2fe3" && port.productId === "0100") {
        return true;
      }
      return false;
    });

    if (hciPortInfos.length === 0) {
      throw new Error(`Cannot find appropriate port`);
    }

    return hciPortInfos[deviceId] ?? null;
  }
}

export async function createHciSerial(deviceId?: number, serial?: Partial<SerialPortOpenOptions<AutoDetectTypes>>) {
  deviceId = deviceId ?? 0;
  serial = serial ?? {};

  const serialPath =
    serial.path ??
    (await (async () => {
      const portInfo = await SerialHciDevice.findSerial(deviceId);
      if (!portInfo) {
        throw new Error("Cannot find appropriate port");
      }
      return portInfo.path;
    })());
  const serialBaudRate = serial.baudRate ?? 1_000_000;

  return new SerialHciDevice({ ...serial, path: serialPath, baudRate: serialBaudRate });
}
