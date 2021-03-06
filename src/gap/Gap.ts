import { EventEmitter } from 'events';
import { AdvData } from './AdvData';
import { Hci } from '../hci/Hci';
import { LeAdvReport, LeExtAdvReport } from '../hci/HciEvent';
import {
  LeExtendedScanEnabled, LeExtendedScanParameters, LeOwnAddressType, LeScanFilterDuplicates,
  LeScanningFilterPolicy, LeScanType
} from '../hci/HciLeController';

type GapScanParamsOptions = Partial<LeExtendedScanParameters>;
type GapScanStartOptions = Partial<Omit<LeExtendedScanEnabled, 'enable'>>;

// TODO this layer should select between standard and extended commands
// TODO emit common advert report

export class Gap extends EventEmitter {
  private scanning = false;

  constructor(private hci: Hci) {
    super();

    hci.on('LeScanTimeout',               this.onLeScanTimeout);
    hci.on('LeAdvertisingReport',         this.onLeAdvertisingReport);
    hci.on('LeExtendedAdvertisingReport', this.onLeExtendedAdvertisingReport);
  }

  public destroy(): void {
    this.hci.removeListener('LeScanTimeout',               this.onLeScanTimeout);
    this.hci.removeListener('LeAdvertisingReport',         this.onLeAdvertisingReport);
    this.hci.removeListener('LeExtendedAdvertisingReport', this.onLeExtendedAdvertisingReport);
  }

  public isScanning(): boolean {
    return this.scanning;
  }

  public async setScanParameters(opts?: GapScanParamsOptions) {
    const ownAddressType       = opts?.ownAddressType       ?? LeOwnAddressType.RandomDeviceAddress;
    const scanningFilterPolicy = opts?.scanningFilterPolicy ?? LeScanningFilterPolicy.All;

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

    await this.hci.leSetExtendedScanParameters({
      ownAddressType, scanningFilterPolicy, scanningPhy,
    });
  }

  public async startScanning(opts?: GapScanStartOptions): Promise<void> {
    const filterDuplicates     = opts?.filterDuplicates     ?? LeScanFilterDuplicates.Disabled;
    const durationMs           = opts?.durationMs           ?? 0;
    const periodSec            = opts?.periodSec            ?? 0;

    await this.hci.leSetExtendedScanEnable({
      enable: true, filterDuplicates, durationMs, periodSec,
    });

    this.scanning = true;
    this.emit('scanStart');
  }

  public async stopScanning(): Promise<void> {
    if (this.scanning === false) {
      return;
    }
    await this.hci.leSetExtendedScanEnable({ enable: false });
    this.scanning = false;
    this.emit('scanStop');
  }

  public onLeScanTimeout = () => {
    this.scanning = false;
    this.emit('scanStop');
  }

  public onLeAdvertisingReport = (report: LeAdvReport) => {
    // TODO
  }

  public onLeExtendedAdvertisingReport = (report: LeExtAdvReport) => {
    try {
      const data = AdvData.parse(report.data ?? Buffer.allocUnsafe(0));
      this.emit('adv-report', report, data);
    } catch (err) {
      console.log(err);
    }
  }
}
