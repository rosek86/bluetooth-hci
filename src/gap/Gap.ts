import assert from 'assert';
import { EventEmitter } from 'events';
import Debug from 'debug';
import { AdvData } from './AdvData';
import { Hci } from '../hci/Hci';
import {
  DisconnectionCompleteEvent,
  LeAdvEventType, LeAdvReport, LeChannelSelAlgoEvent, LeConnectionCompleteEvent,
  LeConnectionRole, LeConnectionUpdateCompleteEvent, LeEnhConnectionCompleteEvent, LeExtAdvReport, LeMasterClockAccuracy,
  LeReadRemoteFeaturesCompleteEvent, ReadRemoteVersionInformationCompleteEvent
} from '../hci/HciEvent';
import {
  LeConnectionUpdate,
  LeExtendedCreateConnection,
  LeExtendedCreateConnectionPhy,
  LeExtendedScanEnabled, LeExtendedScanParameters, LeInitiatorFilterPolicy,
  LeOwnAddressType, LeScanFilterDuplicates,
  LeScanningFilterPolicy, LeScanType, LeSupportedFeatures
} from '../hci/HciLeController';
import { Address } from '../utils/Address';
import { Att } from '../att/Att';
import { L2CAP } from '../l2cap/L2CAP';
import { ReadTransmitPowerLevelType } from '../hci/HciControlAndBaseband';

export type GapScanParamsOptions = Partial<LeExtendedScanParameters>;
export type GapScanStartOptions = Partial<Omit<LeExtendedScanEnabled, 'enable'>>;
export type GapConnectParams = Partial<Omit<LeExtendedCreateConnection, 'peerAddress'>> & { peerAddress: Address };

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
  leRemoteFeatures: LeSupportedFeatures;
};

const debug = Debug('nble-gap');

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

interface GapDeviceInfo {
  connComplete?: LeConnectionCompleteEvent;
  enhConnComplete?: LeEnhConnectionCompleteEvent;
  channelSelectionAlgorithm?: LeChannelSelAlgoEvent;
  versionInformation?: ReadRemoteVersionInformationCompleteEvent;
  leRemoteFeatures?: LeReadRemoteFeaturesCompleteEvent;
  att?: Att;
};

export class Gap extends EventEmitter {
  private extended = false;
  private scanning = false;

  private l2cap: L2CAP;

  private connectedDevices: Map<number, GapDeviceInfo> = new Map();

  constructor(private hci: Hci) {
    super();

    this.l2cap = new L2CAP(this.hci);

    this.hci.on('LeAdvertisingReport',                  this.onLeAdvertisingReport);
    this.hci.on('LeExtendedAdvertisingReport',          this.onLeExtendedAdvertisingReport);
    this.hci.on('LeScanTimeout',                        this.onLeScanTimeout);
    this.hci.on('LeConnectionComplete',                 this.onLeConnectionComplete);
    this.hci.on('LeEnhancedConnectionComplete',         this.onLeEnhancedConnectionComplete);
    this.hci.on('LeChannelSelectionAlgorithm',          this.onLeChannelSelectionAlgorithm);
    this.hci.on('DisconnectionComplete',                this.onDisconnectionComplete);
  }

  public async init() {
    const commands = await this.hci.readLocalSupportedCommands();

    if (commands.isSupported('leSetExtendedScanParameters') &&
        commands.isSupported('leSetExtendedScanEnable')) {
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

  public async connect(params: GapConnectParams): Promise<void> {
    const defaultScanParams: LeExtendedCreateConnectionPhy = {
      scanIntervalMs: 100,
      scanWindowMs: 100,
      connectionIntervalMinMs: 7.5,
      connectionIntervalMaxMs: 100,
      connectionLatency: 0,
      supervisionTimeoutMs: 4000,
      minCeLengthMs: 2.5,
      maxCeLengthMs: 3.75,
    };
    if (this.extended) {
      await this.hci.leExtendedCreateConnection({
        ownAddressType: params?.ownAddressType ?? LeOwnAddressType.RandomDeviceAddress,
        initiatorFilterPolicy: params?.initiatorFilterPolicy ?? LeInitiatorFilterPolicy.PeerAddress,
        peerAddress: params.peerAddress,
        initiatingPhy: params?.initiatingPhy ?? { Phy1M: defaultScanParams },
      });
    } else {
      if (params?.initiatingPhy?.Phy2M || params?.initiatingPhy?.PhyCoded) {
        throw new Error('Extended connection parameters are not supported');
      }
      await this.hci.leCreateConnection({
        ownAddressType: params?.ownAddressType ?? LeOwnAddressType.RandomDeviceAddress,
        initiatorFilterPolicy: params?.initiatorFilterPolicy ?? LeInitiatorFilterPolicy.PeerAddress,
        peerAddress: params.peerAddress,
        ...(params?.initiatingPhy?.Phy1M ?? defaultScanParams),
      });
    }
  }

  public async connectionUpdate(params: LeConnectionUpdate): Promise<LeConnectionUpdateCompleteEvent> {
    return await this.hci.leConnectionUpdateAwait(params);
  }

  public async readTransmitPowerLevels(connectionHandle: number) {
    const current = await this.hci.readTransmitPowerLevel(
      connectionHandle,
      ReadTransmitPowerLevelType.Current
    );
    const maximum = await this.hci.readTransmitPowerLevel(
      connectionHandle,
      ReadTransmitPowerLevelType.Maximum
    );
    return { current, maximum };
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
    try {
      const advertisingReport: GapAdvertReport = {
        address: report.address,
        rssi: report.rssi,
        scanResponse: report.eventType === LeAdvEventType.ScanResponse,
        data: AdvData.parse(report.data ?? Buffer.alloc(0)),
      };
      this.emit('GapLeAdvReport', advertisingReport, report);
    } catch (err) {
      debug(err);
    }
  };

  private onLeExtendedAdvertisingReport = (report: LeExtAdvReport): void => {
    try {
      const advertisingReport: GapAdvertReport = {
        address: report.address,
        rssi: report.rssi,
        scanResponse: report.eventType.ScanResponse,
        data: AdvData.parse(report.data ?? Buffer.alloc(0)),
      };
      this.emit('GapLeAdvReport', advertisingReport, report);
    } catch (err) {
      debug(err);
    }
  };

  private onLeConnectionComplete = (_: Error|null, event: LeConnectionCompleteEvent) => {
    this.scanning = false;
    this.connectedDevices.set(event.connectionHandle, { connComplete: event });
  };

  private onLeEnhancedConnectionComplete = (_: Error|null, event: LeEnhConnectionCompleteEvent) => {
    this.scanning = false;
    this.connectedDevices.set(event.connectionHandle, { enhConnComplete: event });
  };

  private onLeChannelSelectionAlgorithm = async (_: Error|null, event: LeChannelSelAlgoEvent) => {
    try {
      this.scanning = false;

      const device = this.connectedDevices.get(event.connectionHandle);
      assert(device);

      const [version, features] = await Promise.all([
        this.hci.readRemoteVersionInformationAwait(event.connectionHandle),
        this.hci.leReadRemoteFeaturesAwait(event.connectionHandle),
      ]);

      device.att = new Att(this.l2cap, event.connectionHandle);
      device.channelSelectionAlgorithm = event;
      device.versionInformation = version;
      device.leRemoteFeatures = features;

      const gapEvent = this.createGapConnectedEvent(event.connectionHandle);
      assert(gapEvent);

      this.emit('GapConnected', gapEvent);
    } catch (err) {
      debug(err);
    }
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
    const features = device.leRemoteFeatures;

    if (!version || !features) {
      return null;
    }

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
        manufacturerName: version.manufacturerName,
        version: version.version,
        subversion: version.subversion,
      },
      leRemoteFeatures: features.leFeatures,
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
      this.connectedDevices.delete(event.connectionHandle);
    }

    this.emit('GapDisconnected', event);
  };
}
