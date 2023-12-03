import chalk from 'chalk';
import {
  HciAdapter, createHciSerial,
  GapCentral, GapAdvertReport,
  LeScanFilterDuplicates
} from '../src';
import { ArgsParser } from './utils/ArgsParser';

type GapAdvertReportExt = GapAdvertReport & {
  timestamp?: Date;
};

const adverts = new Map<string, { adv?: GapAdvertReportExt; sr?: GapAdvertReportExt }>();

(async () => {
  let printTime = Date.now();

  try {
    const args = await ArgsParser.getOptions();
    if (!args || args.type !== 'serial') {
      throw new Error('Invalid input parameters');
    }

    const adapter = new HciAdapter(await createHciSerial(args.deviceId, args.serial));
    await adapter.open();
    await adapter.defaultAdapterSetup();

    const gap = new GapCentral(adapter.Hci);
    await gap.init();

    await gap.setScanParameters();
    await gap.startScanning({ filterDuplicates: LeScanFilterDuplicates.Enabled });
    console.log('scanning...');

    gap.on('GapLeScanState', (scanning) => {
      console.log('scanning', scanning);
    });

    gap.on('GapLeAdvReport', async (report) => {
      saveReport(report);
      if ((Date.now() - printTime) > 1000) {
        printTime = Date.now();
        print(adapter);
      }
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();

function saveReport(report: GapAdvertReport) {
  const entry = adverts.get(report.address.toString()) ?? {};

  if (!report.scanResponse) {
    entry.adv = report;
    entry.adv.timestamp = new Date();
  } else {
    entry.sr = report;
    entry.sr.timestamp = new Date();
  }

  adverts.set(report.address.toString(), entry);
}

function print(adapter: HciAdapter) {
  console.log();
  console.log('adverts', adverts.size);
  for (const [ address, { adv, sr } ] of adverts.entries()) {
    const ident = (adv?.data?.manufacturerData ?? sr?.data?.manufacturerData)?.ident;

    process.stdout.write(`${chalk.blue.bold(address)} at ${chalk.magenta(adv?.timestamp?.toLocaleTimeString())}`);
    if (ident) {
      process.stdout.write(` (${chalk.green(adapter.manufacturerNameFromCode(ident))})`);
    }
    process.stdout.write('\n');

    if (adv) {
      console.log(`                 `, adv?.rssi, JSON.stringify(adv?.data));
    }
    if (sr) {
      console.log(`                 `, sr?.rssi, JSON.stringify(sr?.data));
    }
  }
}
