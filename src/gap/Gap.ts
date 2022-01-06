import { EventEmitter } from 'events';
import { AdvData } from './AdvData';
import { Hci } from '../hci/Hci';
import {
  LeAdvEventType, LeAdvReport, LeConnectionCompleteEvent,
  LeEnhConnectionCompleteEvent, LeExtAdvReport
} from '../hci/HciEvent';
import {
  LeExtendedScanEnabled, LeExtendedScanParameters, LeOwnAddressType, LeScanFilterDuplicates,
  LeScanningFilterPolicy, LeScanType
} from '../hci/HciLeController';
import { Address } from '../utils/Address';

type GapScanParamsOptions = Partial<LeExtendedScanParameters>;
type GapScanStartOptions = Partial<Omit<LeExtendedScanEnabled, 'enable'>>;

export interface GapAdvertReport {
  address: Address;
  rssi: number | null;
  scanResponse: boolean;
  data: AdvData;
}

export declare interface Gap {
  on(event: 'GapLeAdvReport', listener: (report: GapAdvertReport, raw: LeAdvReport | LeExtAdvReport) => void): this;
  once(event: 'GapLeAdvReport', listener: (report: GapAdvertReport, raw: LeAdvReport | LeExtAdvReport) => void): this;

  on(event: 'GapLeScanState', listener: (scanning: boolean) => void): this;
  once(event: 'GapLeScanState', listener: (scanning: boolean) => void): this;
}

export class Gap extends EventEmitter {
  private scanning = false;
  private extended = false;

  constructor(private hci: Hci) {
    super();

    hci.on('LeAdvertisingReport',           this.onLeAdvertisingReport);
    hci.on('LeExtendedAdvertisingReport',   this.onLeExtendedAdvertisingReport);
    hci.on('LeScanTimeout',                 this.onLeScanTimeout);
    hci.on('LeConnectionComplete',          this.onLeConnectionComplete);
    hci.on('LeEnhancedConnectionComplete',  this.onLeEnhancedConnectionComplete);
  }

  public async init() {
    const commands = await this.hci.readLocalSupportedCommands();

    if (commands.leSetExtendedScanParameters && commands.leSetExtendedScanEnable) {
      this.extended = true;
    }
  }

  public destroy(): void {
    this.hci.removeListener('LeAdvertisingReport',          this.onLeAdvertisingReport);
    this.hci.removeListener('LeExtendedAdvertisingReport',  this.onLeExtendedAdvertisingReport);
    this.hci.removeListener('LeScanTimeout',                this.onLeScanTimeout);
    this.hci.removeListener('LeConnectionComplete',         this.onLeConnectionComplete);
    this.hci.removeListener('LeEnhancedConnectionComplete', this.onLeEnhancedConnectionComplete);
    this.removeAllListeners();
  }

  public isScanning(): boolean {
    return this.scanning;
  }

  public async setScanParameters(opts?: GapScanParamsOptions): Promise<void> {
    const ownAddressType       = opts?.ownAddressType       ?? LeOwnAddressType.RandomDeviceAddress;
    const scanningFilterPolicy = opts?.scanningFilterPolicy ?? LeScanningFilterPolicy.All;
    const scanningPhy = this.getScanningPhy(opts);

    if (this.extended) {
      await this.hci.leSetExtendedScanParameters({
        scanningPhy, ownAddressType, scanningFilterPolicy,
      });
    } else {
      await this.hci.leSetScanParameters({
        type:       opts?.scanningPhy?.Phy1M?.type       ?? LeScanType.Active,
        intervalMs: opts?.scanningPhy?.Phy1M?.intervalMs ?? 100,
        windowMs:   opts?.scanningPhy?.Phy1M?.windowMs   ?? 100,
        ownAddressType, scanningFilterPolicy,
      });
    }
  }

  private getScanningPhy(opts?: GapScanParamsOptions): LeExtendedScanParameters['scanningPhy'] {
    if (opts?.scanningPhy?.Phy1M || opts?.scanningPhy?.PhyCoded) {
      return opts.scanningPhy;
    } else {
      return { Phy1M: { type: LeScanType.Active, intervalMs: 100, windowMs: 100 } };
    }
  }

  public async startScanning(opts?: GapScanStartOptions): Promise<void> {
    if (this.scanning === true) {
      return;
    }

    const filterDuplicates     = opts?.filterDuplicates     ?? LeScanFilterDuplicates.Disabled;
    const durationMs           = opts?.durationMs           ?? 0;
    const periodSec            = opts?.periodSec            ?? 0;

    if (this.extended) {
      await this.hci.leSetExtendedScanEnable({
        enable: true, filterDuplicates, durationMs, periodSec,
      });
    } else {
      if (durationMs > 0) {
        setTimeout(() => this.onLeScanTimeout, durationMs);
      }
      const filterDuplicatesEnabled = filterDuplicates !== LeScanFilterDuplicates.Disabled;
      await this.hci.leSetScanEnable(true, filterDuplicatesEnabled);
    }

    this.scanning = true;
    this.emit('GapLeScanState', true);
  }

  public async stopScanning(): Promise<void> {
    if (this.scanning === false) {
      return;
    }

    if (this.extended) {
      await this.hci.leSetExtendedScanEnable({ enable: false });
    } else {
      await this.hci.leSetScanEnable(false);
    }

    this.scanning = false;
    this.emit('GapLeScanState', false);
  }

  public onLeScanTimeout = () => {
    this.scanning = false;
    this.emit('GapLeScanState', false);
  };

  public onLeAdvertisingReport = (report: LeAdvReport): void => {
    try {
      const advertisingReport: GapAdvertReport = {
        address: report.address,
        rssi: report.rssi,
        scanResponse: report.eventType === LeAdvEventType.ScanResponse,
        data: AdvData.parse(report.data ?? Buffer.alloc(0)),
      };
      this.emit('GapLeAdvReport', advertisingReport, report);
    } catch (err) {
      console.log(err);
    }
  };

  public onLeExtendedAdvertisingReport = (report: LeExtAdvReport): void => {
    try {
      const advertisingReport: GapAdvertReport = {
        address: report.address,
        rssi: report.rssi,
        scanResponse: report.eventType.ScanResponse,
        data: AdvData.parse(report.data ?? Buffer.alloc(0)),
      };
      this.emit('GapLeAdvReport', advertisingReport, report);
    } catch (err) {
      console.log(err);
    }
  };

  private onLeConnectionComplete = (_err: Error|null, _event: LeConnectionCompleteEvent) => {
    this.scanning = false;
  };

  private onLeEnhancedConnectionComplete = (_err: Error|null, _event: LeEnhConnectionCompleteEvent) => {
    this.scanning = false;
  };
}
