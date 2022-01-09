import { EventEmitter } from 'events';
import { AdvData } from './AdvData';
import { Hci } from '../hci/Hci';
import {
  DisconnectionCompleteEvent,
  LeAdvEventType, LeAdvReport, LeChannelSelAlgoEvent, LeConnectionCompleteEvent,
  LeConnectionRole,
  LeEnhConnectionCompleteEvent, LeExtAdvReport, LeMasterClockAccuracy, LeReadRemoteFeaturesCompleteEvent, ReadRemoteVersionInformationCompleteEvent
} from '../hci/HciEvent';
import {
  LeExtendedScanEnabled, LeExtendedScanParameters, LeInitiatorFilterPolicy,
  LeOwnAddressType, LeScanFilterDuplicates,
  LeScanningFilterPolicy, LeScanType
} from '../hci/HciLeController';
import { Address } from '../utils/Address';
import { Att } from '../att/Att';
import { L2CAP } from '../l2cap/L2CAP';

type GapScanParamsOptions = Partial<LeExtendedScanParameters>;
type GapScanStartOptions = Partial<Omit<LeExtendedScanEnabled, 'enable'>>;

export interface GapAdvertReport {
  address: Address;
  rssi: number | null;
  scanResponse: boolean;
  data: AdvData;
}

export interface GapConnectEvent {
  connectionHandle: number;
  address: Address;
  connectionParams: {
    connectionIntervalMs: number;
    supervisionTimeoutMs: number;
    connectionLatency: number;
  }
  role: LeConnectionRole;
  masterClockAccuracy: LeMasterClockAccuracy;
  localResolvablePrivateAddress?: Address;
  peerResolvablePrivateAddress?: Address;
  versionInfo: {
    manufacturerName: number;
    version: number;
    subversion: number;
  };
  leRemoteFeatures: bigint;
};

export declare interface Gap {
  on(event: 'GapLeAdvReport', listener: (report: GapAdvertReport, raw: LeAdvReport | LeExtAdvReport) => void): this;
  once(event: 'GapLeAdvReport', listener: (report: GapAdvertReport, raw: LeAdvReport | LeExtAdvReport) => void): this;
  removeListener(event: 'GapLeAdvReport', listener: (report: GapAdvertReport, raw: LeAdvReport | LeExtAdvReport) => void): this;

  on(event: 'GapLeScanState', listener: (scanning: boolean) => void): this;
  once(event: 'GapLeScanState', listener: (scanning: boolean) => void): this;
  removeListener(event: 'GapLeScanState', listener: (scanning: boolean) => void): this;

  on(event: 'GapConnected', listener: (event: GapConnectEvent) => void): this;
  once(event: 'GapConnected', listener: (event: GapConnectEvent) => void): this;
  removeListener(event: 'GapConnected', listener: (event: GapConnectEvent) => void): this;

  on(event: 'GapDisconnected', listener: (reason: DisconnectionCompleteEvent) => void): this;
  once(event: 'GapDisconnected', listener: (reason: DisconnectionCompleteEvent) => void): this;
  removeListener(event: 'GapDisconnected', listener: (reason: DisconnectionCompleteEvent) => void): this;
}

export class Gap extends EventEmitter {
  private extended = false;

  private scanning = false;
  private connecting = false;

  private l2cap: L2CAP;

  private connectedDevices: Map<number, {
    connComplete?: LeConnectionCompleteEvent;
    enhConnComplete?: LeEnhConnectionCompleteEvent;
    channelSelectionAlgorithm?: LeChannelSelAlgoEvent;
    versionInformation?: ReadRemoteVersionInformationCompleteEvent;
    leRemoteFeatures?: LeReadRemoteFeaturesCompleteEvent;
    att?: Att;
  }> = new Map();

  constructor(private hci: Hci) {
    super();

    this.l2cap = new L2CAP(this.hci);

    this.hci.on('LeAdvertisingReport',                  this.onLeAdvertisingReport);
    this.hci.on('LeExtendedAdvertisingReport',          this.onLeExtendedAdvertisingReport);
    this.hci.on('LeScanTimeout',                        this.onLeScanTimeout);
    this.hci.on('LeConnectionComplete',                 this.onLeConnectionComplete);
    this.hci.on('LeEnhancedConnectionComplete',         this.onLeEnhancedConnectionComplete);
    this.hci.on('LeChannelSelectionAlgorithm',          this.onLeChannelSelectionAlgorithm);
    this.hci.on('ReadRemoteVersionInformationComplete', this.onReadRemoteVersionInformationComplete);
    this.hci.on('LeReadRemoteFeaturesComplete',         this.onLeReadRemoteFeaturesComplete);
    this.hci.on('DisconnectionComplete',                this.onDisconnectionComplete);
  }

  public async init() {
    const commands = await this.hci.readLocalSupportedCommands();

    if (commands.leSetExtendedScanParameters && commands.leSetExtendedScanEnable) {
      this.extended = true;
    }

    await this.l2cap.init();
  }

  public destroy(): void {
    this.hci.removeListener('LeAdvertisingReport',                  this.onLeAdvertisingReport);
    this.hci.removeListener('LeExtendedAdvertisingReport',          this.onLeExtendedAdvertisingReport);
    this.hci.removeListener('LeScanTimeout',                        this.onLeScanTimeout);
    this.hci.removeListener('LeConnectionComplete',                 this.onLeConnectionComplete);
    this.hci.removeListener('LeEnhancedConnectionComplete',         this.onLeEnhancedConnectionComplete);
    this.hci.removeListener('LeChannelSelectionAlgorithm',          this.onLeChannelSelectionAlgorithm);
    this.hci.removeListener('ReadRemoteVersionInformationComplete', this.onReadRemoteVersionInformationComplete);
    this.hci.removeListener('LeReadRemoteFeaturesComplete',         this.onLeReadRemoteFeaturesComplete);
    this.hci.removeListener('DisconnectionComplete',                this.onDisconnectionComplete);
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

    const filterDuplicates = opts?.filterDuplicates ?? LeScanFilterDuplicates.Disabled;
    const durationMs       = opts?.durationMs       ?? 0;
    const periodSec        = opts?.periodSec        ?? 0;

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

  public async connect(peerAddress: Address): Promise<void> {
    // TODO: add params
    if (this.connecting === true) {
      return;
    }
    this.connecting = true;

    if (this.extended) {
      await this.hci.leExtendedCreateConnection({
        initiatorFilterPolicy: LeInitiatorFilterPolicy.PeerAddress,
        ownAddressType: LeOwnAddressType.RandomDeviceAddress,
        peerAddress: peerAddress,
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
    } else {
      await this.hci.leCreateConnection({
        ownAddressType: LeOwnAddressType.RandomDeviceAddress,
        initiatorFilterPolicy: LeInitiatorFilterPolicy.PeerAddress,
        peerAddress: peerAddress,
        scanIntervalMs: 100,
        scanWindowMs: 100,
        connectionIntervalMinMs: 7.5,
        connectionIntervalMaxMs: 100,
        connectionLatency: 0,
        supervisionTimeoutMs: 4000,
        minCeLengthMs: 2.5,
        maxCeLengthMs: 3.75,
      });
    }
  }

  public async disconnect(connectionHandle: number): Promise<void> {
    await this.hci.disconnect(connectionHandle);
  }

  public getATT(connectionHandle: number): Att | undefined {
    const device = this.connectedDevices.get(connectionHandle);
    if (device) {
      return device.att;
    }
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

  private onLeConnectionComplete = (_err: Error|null, event: LeConnectionCompleteEvent) => {
    this.scanning = false;
    this.connectedDevices.set(event.connectionHandle, {
      connComplete: event,
      att: new Att(this.l2cap, event.connectionHandle),
    });
  };

  private onLeEnhancedConnectionComplete = (_err: Error|null, event: LeEnhConnectionCompleteEvent) => {
    this.scanning = false;
    this.connectedDevices.set(event.connectionHandle, {
      enhConnComplete: event,
      att: new Att(this.l2cap, event.connectionHandle),
    });
  };

  private onLeChannelSelectionAlgorithm = async (_err: Error|null, event: LeChannelSelAlgoEvent) => {
    this.connecting = false;
    this.scanning = false;

    const device = this.connectedDevices.get(event.connectionHandle);
    if (device) {
      device.channelSelectionAlgorithm = event;
    }

    await this.hci.readRemoteVersionInformation(event.connectionHandle);
  };

  private onReadRemoteVersionInformationComplete = async (err: Error|null, event: ReadRemoteVersionInformationCompleteEvent) => {
    const device = this.connectedDevices.get(event.connectionHandle);
    if (device) {
      device.versionInformation = event;
    }

    await this.hci.leReadRemoteFeatures(event.connectionHandle);
  };

  private onLeReadRemoteFeaturesComplete = (err: Error|null, event: LeReadRemoteFeaturesCompleteEvent) => {
    const device = this.connectedDevices.get(event.connectionHandle);
    if (device) {
      device.leRemoteFeatures = event;
    }

    const gapEvent = this.createGapConnectedEvent(event.connectionHandle);
    if (!gapEvent) {
      return;
    }

    this.emit('GapConnected', gapEvent);
  };

  private createGapConnectedEvent(connectionHandle: number): GapConnectEvent | null {
    const device = this.connectedDevices.get(connectionHandle);
    if (!device) {
      return null;
    }

    const conn = device.connComplete ?? device.enhConnComplete;
    if (!conn) {
      return null;
    }

    const version = device.versionInformation;
    const leRemoteFeatures = device.leRemoteFeatures;

    const event: GapConnectEvent = {
      connectionHandle: conn.connectionHandle,
      address: conn.peerAddress,
      connectionParams: {
        connectionIntervalMs: conn.connectionIntervalMs,
        connectionLatency: conn.connectionLatency,
        supervisionTimeoutMs: conn.supervisionTimeoutMs,
      },
      role: conn.role,
      masterClockAccuracy: conn.masterClockAccuracy,
      versionInfo: {
        manufacturerName: version?.manufacturerName ?? 0,
        version: version?.version ?? 0,
        subversion: version?.subversion ?? 0,
      },
      leRemoteFeatures: leRemoteFeatures?.leFeatures ?? 0n,
    };

    if (this.extended) {
      event.localResolvablePrivateAddress = device.enhConnComplete?.localResolvablePrivateAddress;
      event.peerResolvablePrivateAddress = device.enhConnComplete?.peerResolvablePrivateAddress;
    }

    return event;
  }

  private onDisconnectionComplete = (_err: Error|null, event: DisconnectionCompleteEvent) => {
    this.scanning = false;

    const device = this.connectedDevices.get(event.connectionHandle);
    if (device) {
      device.att?.destroy();
      this.connectedDevices.delete(event.connectionHandle);
    }

    this.emit('GapDisconnected', event);
  };
}
