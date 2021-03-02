import { EventEmitter } from 'events';
import { Hci } from './Hci';
import { HciError, HciErrorCode } from './HciError';
import {
  LeExtendedScanEnabled, LeExtendedScanParameters, LeOwnAddressType, LeScanFilterDuplicates,
  LeScanningFilterPolicy, LeScanType
} from './HciLeController';

type GapScanOptions = Partial<LeExtendedScanParameters> & Partial<Omit<LeExtendedScanEnabled, 'enable'>>;

// TODO check if extended commands are enabled

export class Gap extends EventEmitter {
  constructor(private hci: Hci) {
    super();
  }

  public async startScanning(opts?: GapScanOptions): Promise<void> {
    const ownAddressType       = opts?.ownAddressType       ?? LeOwnAddressType.RandomDeviceAddress;
    const scanningFilterPolicy = opts?.scanningFilterPolicy ?? LeScanningFilterPolicy.All;
    const filterDuplicates     = opts?.filterDuplicates     ?? LeScanFilterDuplicates.Disabled;
    const durationMs           = opts?.durationMs           ?? 0;
    const periodSec            = opts?.periodSec            ?? 0;

    let scanningPhy: LeExtendedScanParameters['scanningPhy'] = {};

    if (!opts?.scanningPhy?.Phy1M && !opts?.scanningPhy?.PhyCoded) {
      scanningPhy.Phy1M = {
        type:       LeScanType.Active,
        intervalMs: 100,
        windowMs:   100,
      };
    } else {
      scanningPhy = opts.scanningPhy;
    }

    await this.stopScanning();

    await this.hci.leSetExtendedScanParameters({
      ownAddressType, scanningFilterPolicy, scanningPhy,
    });

    await this.hci.leSetExtendedScanEnable({
      enable: true, filterDuplicates, durationMs, periodSec,
    });
  }

  public async stopScanning(): Promise<void> {
    try {
      await this.hci.leSetExtendedScanEnable({ enable: false });
    } catch (err) {
      if (err instanceof HciError) {
        // Scanning not started
        if (err.errno !== HciErrorCode.CommandDisallowed) {
          throw err;
        }
      } else {
        throw err;
      }
    }
  }
}
