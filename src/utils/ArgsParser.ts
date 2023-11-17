import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { AdapterParams } from './HciAdapterFactory.js';

export interface DefaultInputArgs {
  deviceType?: 'usb' | 'serial' | 'hci';
  deviceId?: number;
  usb?: {
    vid?: number;
    pid?: number;
  };
}

interface InputArgs {
  deviceType: 'usb' | 'serial' | 'hci';
  deviceId: number;
  usbVid: number;
  usbPid: number;
  usbBus: number | undefined;
  usbAddress: number | undefined;
  serialPath: string | null;
  serialBaudRate: number;
  serialDataBits: 8|7|6|5;
  serialParity: 'none'|'even'|'mark'|'odd'|'space';
  serialStopBits: 1|2;
  serialRtscts: boolean;
}

export class ArgsParser {
  public async getInputArgs(defaults?: DefaultInputArgs): Promise<InputArgs | null> {
    const argv = await yargs(hideBin(process.argv)).options({
      'device-type':      { choices: ['serial', 'usb', 'hci'] , default: defaults?.deviceType ?? 'serial' },
      'device-id':        { type: 'number', default: defaults?.deviceId ?? 0 },
      'usb-vid':          { type: 'number', default: defaults?.usb?.vid ?? 0x2fe3 },
      'usb-pid':          { type: 'number', default: defaults?.usb?.pid ?? 0x000d },
      'usb-bus':          { type: 'number' },
      'usb-address':      { type: 'number' },
      'serial-path':      { type: 'string', default: null },
      'serial-baud-rate': { type: 'number', default: 1_000_000 },
      'serial-data-bits': { choices: [ 8, 7, 6, 5 ], default: 8 },
      'serial-parity':    { choices: [ 'none', 'even', 'mark', 'odd', 'space' ], default: 'none' },
      'serial-stop-bits': { choices: [ 1, 2 ], default: 1 },
      'serial-rtscts':    { type: 'boolean', default: true },
    }).argv;
    if (argv.deviceType !== 'serial' && argv.deviceType !== 'usb' && argv.deviceType !== 'hci') {
      return null;
    }
    if (argv.serialDataBits !== 8 && argv.serialDataBits !== 7 &&
        argv.serialDataBits !== 6 && argv.serialDataBits !== 5) {
      return null;
    }
    if (argv.serialParity !== 'none' && argv.serialParity !== 'even' &&
        argv.serialParity !== 'mark' && argv.serialParity !== 'odd' &&
        argv.serialParity !== 'space') {
      return null;
    }
    if (argv.serialStopBits !== 1 && argv.serialStopBits !== 2) {
      return null;
    }
    return {
      deviceType:     argv.deviceType,
      deviceId:       argv.deviceId,
      usbVid:         argv.usbVid,
      usbPid:         argv.usbPid,
      usbBus:         argv.usbBus,
      usbAddress:     argv.usbAddress,
      serialPath:     argv.serialPath,
      serialBaudRate: argv.serialBaudRate,
      serialDataBits: argv.serialDataBits,
      serialParity:   argv.serialParity,
      serialStopBits: argv.serialStopBits,
      serialRtscts:   argv.serialRtscts,
    };
  }

  public getAdapterOptions(args: InputArgs): AdapterParams | null {
    if (args.deviceType === 'serial') {
      const adapterOptions: AdapterParams = {
        type: 'serial',
        deviceId: args.deviceId,
        serial: {
          path:     args.serialPath ?? undefined,
          baudRate: args.serialBaudRate,
          dataBits: args.serialDataBits,
          parity:   args.serialParity,
          stopBits: args.serialStopBits,
          rtscts:   args.serialRtscts,
        },
      };
      return adapterOptions;
    }
    if (args.deviceType === 'usb') {
      const adapterOptions: AdapterParams = {
        type: 'usb',
        deviceId: args.deviceId,
        usb: {
          vid:      args.usbVid,
          pid:      args.usbPid,
          bus:      args.usbBus,
          address:  args.usbAddress,
        }
      };
      return adapterOptions;
    }
    if (args.deviceType === 'hci') {
      const adapterOptions: AdapterParams = {
        type: 'hci',
        deviceId: args.deviceId,
      };
      return adapterOptions;
    }
    return null;
  }
}
