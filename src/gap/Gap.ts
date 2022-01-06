import { EventEmitter } from 'events';
import { AdvData } from './AdvData';
import { Hci } from '../hci/Hci';
import {
  DisconnectionCompleteEvent,
  LeAdvEventType, LeAdvReport, LeChannelSelAlgoEvent, LeConnectionCompleteEvent,
  LeEnhConnectionCompleteEvent, LeExtAdvReport
} from '../hci/HciEvent';
import {
  LeExtendedScanEnabled, LeExtendedScanParameters, LeInitiatorFilterPolicy, LeOwnAddressType, LePeerAddressType, LeScanFilterDuplicates,
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
  removeListener(event: 'GapLeAdvReport', listener: (report: GapAdvertReport, raw: LeAdvReport | LeExtAdvReport) => void): this;

  on(event: 'GapLeScanState', listener: (scanning: boolean) => void): this;
  once(event: 'GapLeScanState', listener: (scanning: boolean) => void): this;
  removeListener(event: 'GapLeScanState', listener: (scanning: boolean) => void): this;

  on(event: 'GapConnected', listener: (event: { connectionHandle: number }) => void): this;
  once(event: 'GapConnected', listener: (event: { connectionHandle: number }) => void): this;
  removeListener(event: 'GapConnected', listener: (event: { connectionHandle: number }) => void): this;

  on(event: 'GapDisconnected', listener: (reason: DisconnectionCompleteEvent) => void): this;
  once(event: 'GapDisconnected', listener: (reason: DisconnectionCompleteEvent) => void): this;
  removeListener(event: 'GapDisconnected', listener: (reason: DisconnectionCompleteEvent) => void): this;
}

export class Gap extends EventEmitter {
  private extended = false;

  private scanning = false;
  private connecting = false;

  constructor(private hci: Hci) {
    super();

    this.hci.on('LeAdvertisingReport',           this.onLeAdvertisingReport);
    this.hci.on('LeExtendedAdvertisingReport',   this.onLeExtendedAdvertisingReport);
    this.hci.on('LeScanTimeout',                 this.onLeScanTimeout);
    this.hci.on('LeConnectionComplete',          this.onLeConnectionComplete);
    this.hci.on('LeEnhancedConnectionComplete',  this.onLeEnhancedConnectionComplete);
    this.hci.on('LeChannelSelectionAlgorithm',   this.onLeChannelSelectionAlgorithm);
    this.hci.on('DisconnectionComplete',         this.onDisconnectionComplete);
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
    this.hci.removeListener('LeChannelSelectionAlgorithm',  this.onLeChannelSelectionAlgorithm);
    this.hci.removeListener('DisconnectionComplete',        this.onDisconnectionComplete);
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

  public async connect(address: Address) {
    if (this.connecting === true) {
      return;
    }
    this.connecting = true;

    await this.hci.leExtendedCreateConnection({
      initiatorFilterPolicy: LeInitiatorFilterPolicy.PeerAddress,
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      peerAddressType: LePeerAddressType.RandomDeviceAddress, // TODO
      peerAddress: address,
      initiatingPhy: {
        Phy1M: {
          scanIntervalMs: 100,
          scanWindowMs: 100,
          connectionIntervalMinMs: 7.5,
          connectionIntervalMaxMs: 100,
          connectionLatency: 0,
          supervisionTimeoutMs: 4000,
          minCeLengthMs: 2.5,
          maxCeLengthMs: 3.75,
        },
      },
    });
  }

  public async disconnect(connectionHandle: number): Promise<void> {
    await this.hci.disconnect(connectionHandle);
  }

  private onLeScanTimeout = () => {
    this.scanning = false;
    this.emit('GapLeScanState', false);
  };

  private onLeAdvertisingReport = (report: LeAdvReport): void => {
    if (this.connecting === true) { return; }
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

  private onLeExtendedAdvertisingReport = (report: LeExtAdvReport): void => {
    if (this.connecting === true) { return; }
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

  private onLeEnhancedConnectionComplete = (_err: Error|null, event: LeEnhConnectionCompleteEvent) => {
    this.scanning = false;
  };

  private onLeChannelSelectionAlgorithm = (_err: Error|null, event: LeChannelSelAlgoEvent) => {
    console.log('LeChannelSelectionAlgorithm', event);
    this.connecting = false;
    this.scanning = false;
    this.emit('GapConnected', event);
  };

  private onDisconnectionComplete = (_err: Error|null, event: DisconnectionCompleteEvent) => {
    this.scanning = false;
    this.emit('GapDisconnected', event);
  };
}
