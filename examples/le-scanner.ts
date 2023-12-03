import chalk from 'chalk';
import {
  HciAdapter, createHciSerial,
  GapCentral, GapAdvertReport,
  LeScanFilterDuplicates
} from '../src';
import { ArgsParser } from './utils/ArgsParser.js';
import { getCompanyName } from '../src/assigned-numbers/Company Identifiers.js';
import { getAppearanceSubcategoryName } from '../src/assigned-numbers/AppearanceValues.js';

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
        print();
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

function print() {
  console.log();
  console.log('adverts', adverts.size);
  const sortedAdverts = [...adverts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [ address, info ] of sortedAdverts) {
    printDeviceInfo(address, info);
  }
}

function printDeviceInfo(address: string, { adv, sr }: { adv?: GapAdvertReportExt; sr?: GapAdvertReportExt }) {
  process.stdout.write(`${chalk.blue.bold(address)} ${chalk.magenta(adv?.timestamp?.toLocaleTimeString())}\n`);

  if (adv) {
    process.stdout.write(`                  Advertisement:\n`);
    printReport(adv);
  }
  if (sr) {
    process.stdout.write(`                  Scan Response:\n`);
    printReport(sr);
  }
}

function printReport(r: GapAdvertReport) {
  const report = structuredClone(r);
  process.stdout.write(`                    - RSSI: ${report.rssi} dBm\n`);
  if (report.data?.completeLocalName) {
    process.stdout.write(`                    - Name: ${report.data.completeLocalName}\n`);
    delete report.data.completeLocalName;
  }
  if (report.data?.shortenedLocalName) {
    process.stdout.write(`                    - Short Name: ${report.data.shortenedLocalName}\n`);
    delete report.data.shortenedLocalName;
  }
  if (report.data?.manufacturerData) {
    const companyName = getCompanyName(report.data?.manufacturerData.ident);
    process.stdout.write(`                    - Company Name: ${chalk.green(companyName ?? 'unknown')}\n`);
    process.stdout.write(`                    - Manufacturer Data: ${JSON.stringify([...report.data.manufacturerData.data])}\n`);
    delete report.data.manufacturerData;
  }
  if (report.data?.appearance) {
    const appearance = getAppearanceSubcategoryName(report.data.appearance.category, report.data.appearance.subcategory);
    process.stdout.write(`                    - Appearance: ${chalk.yellow(appearance)}\n`);
    delete report.data.appearance;
  }
  if (report.data?.txPowerLevel) {
    process.stdout.write(`                    - Tx Power Level: ${report.data.txPowerLevel} dBm\n`);
    delete report.data.txPowerLevel;
  }
  if (report.data?.completeListOf16bitServiceClassUuids) {
    process.stdout.write(`                    - 16-bit UUIDs: ${report.data.completeListOf16bitServiceClassUuids}\n`);
    delete report.data.completeListOf16bitServiceClassUuids;
  }
  if (report.data?.incompleteListOf16bitServiceClassUuids) {
    process.stdout.write(`                    - Incomplete 16-bit UUIDs: ${report.data.incompleteListOf16bitServiceClassUuids}\n`);
    delete report.data.incompleteListOf16bitServiceClassUuids;
  }
  if (Object.keys(report.data).length > 0) {
    process.stdout.write(`                    - Data: ${JSON.stringify(report.data)}\n`);
  }
}
