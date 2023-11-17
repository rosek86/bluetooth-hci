import { EOL } from 'node:os';
import chalk from 'chalk';
import { uuids } from '../assigned numbers/16-bit UUID Numbers.js';
import { Profile, Service, Characteristic, IncludedService, Descriptor } from '../gatt/GattDirectory.js';

export const uuidInfo = (uuid: string): { type: string; for: string; } | undefined => uuids.entries[uuid];

export const amendProfileWithUuidNames = (p: Profile): Profile => {
  const amendDescriptor = (e: Descriptor): Descriptor => {  
    e.descriptor.uuidInfo = uuidInfo(e.descriptor.uuid);
    return e;
  };
  const amendCharacteristic = (e: Characteristic): Characteristic => {
    e.characteristic.uuidInfo = uuidInfo(e.characteristic.uuid);
    for (const descriptor of Object.values(e.descriptors ?? {})) {
      amendDescriptor(descriptor);
    }
    return e;
  };
  const amendService = (e: Service | IncludedService): Service => {
    e.service.uuidInfo = uuidInfo(e.service.uuid);
    for (const includedService of Object.values(e.includedServices ?? {})) {
      amendService(includedService);
    }
    for (const characteristic of Object.values(e.characteristics ?? {})) {
      amendCharacteristic(characteristic);
    }
    return e;
  };
  for (const service of Object.values(p.services ?? {})) {
    amendService(service);
  }
  return p;
};

interface EntryInfo {
  handle: number;
  uuid: string;
  uuidInfo?: { type: string; for: string; };
}

export const printProfile = (p: Profile): void => {
  const padding = (level: number) => ''.padStart(level, ' ');
  const print = (ident: 'S' | 'C' | 'D', info: EntryInfo, level: number) => {
    process.stdout.write(padding(level));
    process.stdout.write(`- ${chalk.yellow(ident)}: `);
    process.stdout.write(chalk.green(info.uuid));
    process.stdout.write(` @ ${chalk.green(info.handle.toString())}`);
    process.stdout.write(info.uuidInfo?.for ? ` (${chalk.blue(info.uuidInfo?.for)})` : '');
    process.stdout.write(EOL);
  }
  const printDescriptor = (e: Descriptor, level: number): void => {
    if (!e.descriptor.uuidInfo) {
      e.descriptor.uuidInfo = uuidInfo(e.descriptor.uuid);
    }
    print('D', e.descriptor, level);
  };
  const printCharacteristic = (e: Characteristic, level: number): void => {
    if (!e.characteristic.uuidInfo) {
      e.characteristic.uuidInfo = uuidInfo(e.characteristic.uuid);
    }

    print('C', e.characteristic, level);

    const properties = Object.entries(e.characteristic.properties)
      .filter(([, value]) => value === true)
      .map(([key]) => key)
      .join(',');
    if (properties.length > 0) {
      process.stdout.write(`${padding(level)}     (${properties})${EOL}`);
    }

    for (const descriptor of Object.values(e.descriptors ?? {})) {
      printDescriptor(descriptor, level + 1);
    }
  };
  const printService = (e: Service | IncludedService, level = 0): void => {
    if (!e.service.uuidInfo) {
      e.service.uuidInfo = uuidInfo(e.service.uuid);
    }

    print('S', e.service, level);

    for (const includedService of Object.values(e.includedServices ?? {})) {
      printService(includedService, level + 1);
    }
    for (const characteristic of Object.values(e.characteristics ?? {})) {
      printCharacteristic(characteristic, level + 1);
    }
  };
  for (const service of Object.values(p.services ?? {})) {
    printService(service);
  }
};
