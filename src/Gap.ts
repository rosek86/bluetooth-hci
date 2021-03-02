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
  private scanning = false;

  constructor(private hci: Hci) {
    super();

    hci.on('LeScanTimeout', () => {
      this.scanning = false;
    });
  }

  public isScanning(): boolean {
    return this.scanning;
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

    this.scanning = true;
  }

  public async stopScanning(): Promise<void> {
    if (this.scanning === false) {
      return;
    }
    await this.hci.leSetExtendedScanEnable({ enable: false });
    this.scanning = false;
  }
}
