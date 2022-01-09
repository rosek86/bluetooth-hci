import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { AdapterParams } from './HciAdapterFactory';

export interface DefaultInputArgs {
  deviceType?: 'usb' | 'serial' | 'hci';
  usb?: {
    vid?: number;
    pid?: number;
  };
}

interface InputArgs {
  deviceType: 'usb' | 'serial' | 'hci';
  usbVid: number;
  usbPid: number;
  usbDevId: number;
  usbBus: number | undefined;
  usbAddress: number | undefined;
  serialBaudRate: number;
  serialDataBits: 8|7|6|5;
  serialParity: 'none'|'even'|'mark'|'odd'|'space';
  serialStopBits: 1|2;
  serialRtscts: boolean;
  hciDevId: number;
}

export class ArgsParser {
  public async getInputArgs(defaults?: DefaultInputArgs): Promise<InputArgs | null> {
    const argv = await yargs(hideBin(process.argv)).options({
      'device-type':      { choices: ['serial', 'usb', 'hci'] , default: defaults?.deviceType ?? 'usb' },
      'usb-vid':          { type: 'number', default: defaults?.usb?.vid ?? 0x2fe3 },
      'usb-pid':          { type: 'number', default: defaults?.usb?.pid ?? 0x000d },
      'usb-dev-id':       { type: 'number', default: 0 },
      'usb-bus':          { type: 'number' },
      'usb-address':      { type: 'number' },
      'serial-baud-rate': { type: 'number', default: 1000000 },
      'serial-data-bits': { choices: [ 8, 7, 6, 5 ], default: 8 },
      'serial-parity':    { choices: [ 'none', 'even', 'mark', 'odd', 'space' ], default: 'none' },
      'serial-stop-bits': { choices: [ 1, 2 ], default: 1 },
      'serial-rtscts':    { type: 'boolean', default: true },
      'hci-dev-id':       { type: 'number', default: 0 },
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
      usbVid:         argv.usbVid,
      usbPid:         argv.usbPid,
      usbDevId:       argv.usbDevId,
      usbBus:         argv.usbBus,
      usbAddress:     argv.usbAddress,
      serialBaudRate: argv.serialBaudRate,
      serialDataBits: argv.serialDataBits,
      serialParity:   argv.serialParity,
      serialStopBits: argv.serialStopBits,
      serialRtscts:   argv.serialRtscts,
      hciDevId:       argv.hciDevId,
    };
  }

  public getAdapterOptions(args: InputArgs): AdapterParams | null {
    if (args.deviceType === 'serial') {
      const adapterOptions: AdapterParams = {
        type: 'serial',
        serial: {
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
        usb: {
          devId:    args.usbDevId,
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
        hci: { devId: args.hciDevId },
      };
      return adapterOptions;
    }
    return null;
  }
}
