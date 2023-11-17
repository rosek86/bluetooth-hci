import assert from 'assert';
import { EventEmitter } from 'events';
import Debug from 'debug';
import chalk from 'chalk';
import { AdvData } from './AdvData.js';
import { Hci } from '../hci/Hci.js';
import {
  DisconnectionCompleteEvent,
  LeAdvEventType, LeAdvReport, LeChannelSelAlgoEvent, LeConnectionCompleteEvent,
  LeConnectionRole, LeConnectionUpdateCompleteEvent, LeEnhConnectionCompleteEvent, LeExtAdvReport, LeMasterClockAccuracy,
  LeReadRemoteFeaturesCompleteEvent, ReadRemoteVersionInformationCompleteEvent
} from '../hci/HciEvent.js';
import {
  LeConnectionUpdate,
  LeExtendedCreateConnectionV1,
  LeExtendedCreateConnectionPhy,
  LeExtendedScanEnabled, LeExtendedScanParameters, LeInitiatorFilterPolicy,
  LeOwnAddressType, LePeerAddressType, LeScanFilterDuplicates,
  LeScanningFilterPolicy, LeScanType, LeSupportedFeatures
} from '../hci/HciLeController.js';
import { Address } from '../utils/Address.js';
import { Att } from '../att/Att.js';
import { L2CAP } from '../l2cap/L2CAP.js';
import { ReadTransmitPowerLevelType } from '../hci/HciControlAndBaseband.js';
import { HciErrorCode } from '../hci/HciError.js';

export type GapScanParamsOptions = Partial<LeExtendedScanParameters>;
export type GapScanStartOptions = Partial<Omit<LeExtendedScanEnabled, 'enable'>>;
export type GapConnectParams = Partial<Omit<LeExtendedCreateConnectionV1, 'peerAddress'>> & { peerAddress: Address };

export interface GapAdvertReport {
  address: Address;
  rssi: number | null;
  connectableAdvertising: boolean;
  scannableAdvertising: boolean;
  directedAdvertising: boolean;
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
}

const debug = Debug('bt-hci-gap');

export declare interface GapCentral {
  on(event: 'GapLeAdvReport', listener: (report: GapAdvertReport, raw: LeAdvReport | LeExtAdvReport) => void): this;
  once(event: 'GapLeAdvReport', listener: (report: GapAdvertReport, raw: LeAdvReport | LeExtAdvReport) => void): this;
  removeListener(event: 'GapLeAdvReport', listener: (report: GapAdvertReport, raw: LeAdvReport | LeExtAdvReport) => void): this;

  on(event: 'GapLeScanState', listener: (scanning: boolean) => void): this;
  once(event: 'GapLeScanState', listener: (scanning: boolean) => void): this;
  removeListener(event: 'GapLeScanState', listener: (scanning: boolean) => void): this;

  on(event: 'GapConnected', listener: (event: GapConnectEvent) => void): this;
  once(event: 'GapConnected', listener: (event: GapConnectEvent) => void): this;
  removeListener(event: 'GapConnected', listener: (event: GapConnectEvent) => void): this;

  on(event: 'GapConnectionCancelled', listener: () => void): this;
  once(event: 'GapConnectionCancelled', listener: () => void): this;
  removeListener(event: 'GapConnectionCancelled', listener: () => void): this;

  on(event: 'GapDisconnected', listener: (reason: DisconnectionCompleteEvent) => void): this;
  once(event: 'GapDisconnected', listener: (reason: DisconnectionCompleteEvent) => void): this;
  removeListener(event: 'GapDisconnected', listener: (reason: DisconnectionCompleteEvent) => void): this;
}

interface GapDeviceInfo {
  connComplete?: LeConnectionCompleteEvent | LeEnhConnectionCompleteEvent;
  channelSelectionAlgorithm?: LeChannelSelAlgoEvent;
  versionInformation?: ReadRemoteVersionInformationCompleteEvent;
  leRemoteFeatures?: LeReadRemoteFeaturesCompleteEvent;
  att?: Att;
}

interface RemoteInfoCache  {
  version: ReadRemoteVersionInformationCompleteEvent;
  features: LeReadRemoteFeaturesCompleteEvent;
}

export class GapCentral extends EventEmitter {
  private extended = false;
  private scanning = false;

  private l2cap: L2CAP;

  private pendingCreateConnection: { timeoutId?: NodeJS.Timeout } | null = null;
  private connectedDevices: Map<number, GapDeviceInfo> = new Map();
  private remoteInfoCache: Map<number, RemoteInfoCache> = new Map();

  public getRemoteVersionInformation(connectionHandle: number): ReadRemoteVersionInformationCompleteEvent {
    const device = this.connectedDevices.get(connectionHandle);
    if (!device?.versionInformation) {
      throw new Error('Version information not exists');
    }
    return device.versionInformation;
  }

  public getLeRemoteFeatures(connectionHandle: number): LeReadRemoteFeaturesCompleteEvent {
    const device = this.connectedDevices.get(connectionHandle);
    if (!device?.leRemoteFeatures) {
      throw new Error('LE Features not exists');
    }
    return device?.leRemoteFeatures;
  }

  public getAtt(connectionHandle: number): Att {
    const device = this.connectedDevices.get(connectionHandle);
    if (!device?.att) {
      throw new Error('Device not connected');
    }
    return device.att;
  }

  constructor(private hci: Hci, private options: { cacheRemoteInfo?: boolean } = { cacheRemoteInfo: false }) {
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
    if (this.scanning === true) { return; }
    this.scanning = true;

    try {
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

      this.emit('GapLeScanState', true);
    } catch (e) {
      debug(e);
      this.scanning = false;
      throw e;
    }
  }

  public async stopScanning(): Promise<void> {
    if (this.scanning === false) { return; }
    this.scanning = false;

    try {
      if (this.extended) {
        await this.hci.leSetExtendedScanEnable({ enable: false });
      } else {
        await this.hci.leSetScanEnable(false);
      }

      this.emit('GapLeScanState', false);
    } catch (e) {
      debug(e);
      this.scanning = true;
      throw e;
    }
  }

  public async connect(params: GapConnectParams, timeoutMs?: number): Promise<void> {
    if (this.pendingCreateConnection) {
      debug('Connection already in progress');
      throw new Error('Connection already in progress');
    }
    this.pendingCreateConnection = {};

    try {
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
        await this.hci.leExtendedCreateConnectionV1({
          ownAddressType: params?.ownAddressType ?? LeOwnAddressType.RandomDeviceAddress,
          initiatorFilterPolicy: params?.initiatorFilterPolicy ?? LeInitiatorFilterPolicy.PeerAddress,
          peerAddressType: params?.peerAddressType ?? LePeerAddressType.RandomDeviceAddress,
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
          peerAddressType: params?.peerAddressType ?? LePeerAddressType.RandomDeviceAddress,
          peerAddress: params.peerAddress,
          ...(params?.initiatingPhy?.Phy1M ?? defaultScanParams),
        });
      }

      if (timeoutMs) {
        debug('Connection timeout', timeoutMs);
        this.pendingCreateConnection.timeoutId = setTimeout(() => {
          this.hci.leCreateConnectionCancel()
            .then(() => {
              debug(chalk.red('Connection cancelled'));
            })
            .catch((err: NodeJS.ErrnoException) => {
              if (err.errno == HciErrorCode.CommandDisallowed) {
                // ignore, we are already connected
              } else {
                debug(chalk.red('Failed to cancel connection'));
                debug(err);
              }
            })
            .finally(() => {
              this.pendingCreateConnection = null;
            });
        }, timeoutMs);
      }

      debug('Connecting to', params.peerAddress.toString());
    } catch (e) {
      debug(e);
      this.pendingCreateConnection = null;
      throw e;
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

  private onLeScanTimeout = () => {
    this.scanning = false;
    this.emit('GapLeScanState', false);
  };

  private onLeAdvertisingReport = (report: LeAdvReport): void => {
    try {
      const advertisingReport: GapAdvertReport = {
        address: report.address,
        rssi: report.rssi,
        connectableAdvertising: report.eventType === LeAdvEventType.Undirected || report.eventType === LeAdvEventType.Directed,
        scannableAdvertising: report.eventType === LeAdvEventType.Scannable || report.eventType === LeAdvEventType.Undirected,
        directedAdvertising: report.eventType === LeAdvEventType.Directed,
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
        connectableAdvertising: report.eventType.ConnectableAdvertising,
        scannableAdvertising: report.eventType.ScannableAdvertising,
        directedAdvertising: report.eventType.DirectedAdvertising,
        scanResponse: report.eventType.ScanResponse,
        data: AdvData.parse(report.data ?? Buffer.alloc(0)),
      };
      this.emit('GapLeAdvReport', advertisingReport, report);
    } catch (err) {
      debug(err);
    }
  };

  private onLeConnectionComplete = (err: NodeJS.ErrnoException|null, event: LeConnectionCompleteEvent) => {
    this.onLeConnectionCompleteCommon(err, event);
  };

  private onLeEnhancedConnectionComplete = (err: NodeJS.ErrnoException|null, event: LeEnhConnectionCompleteEvent) => {
    this.onLeConnectionCompleteCommon(err, event);
  };


  private async onLeConnectionCompleteCommon(
    err: NodeJS.ErrnoException|null,
    event: LeConnectionCompleteEvent | LeEnhConnectionCompleteEvent
  ): Promise<void> {
    try {
      debug('onLeConnectionCompleteCommon');

      clearTimeout(this.pendingCreateConnection?.timeoutId);
      this.pendingCreateConnection = null;

      /*
        If the cancellation was successful then,
        after the HCI_Command_Complete event for the HCI_LE_Create_Connection_Cancel command,
        either an HCI_LE_Connection_Complete or an HCI_LE_Enhanced_Connection_Complete event shall be generated.
        In either case, the event shall be sent with the error code Unknown Connection Identifier (0x02).
      */

      if (err?.errno === HciErrorCode.UnknownConnectionId) {
        debug(chalk.red(`Connection cancelled (${err.message})`));
        this.emit('GapConnectionCancelled');
        return;
      }

      const device: GapDeviceInfo = {
        connComplete: event,
        att: new Att(this.l2cap, event.connectionHandle),
      };
      this.connectedDevices.set(event.connectionHandle, device);

      const connectionIntervalMs = event.connectionIntervalMs;
      debug(`Connection interval ${connectionIntervalMs} ms`);

      if (this.options.cacheRemoteInfo) {
        const cache = this.remoteInfoCache.get(event.peerAddress.toNumeric());
        if (cache) {
          device.versionInformation = cache.version;
          device.leRemoteFeatures = cache.features;
        } else {
          const { version, features } = await this.getRemoteInfo(event);
          device.versionInformation = version;
          device.leRemoteFeatures = features;
          this.remoteInfoCache.set(event.peerAddress.toNumeric(), { version, features });
        }
      } else {
        const { version, features } = await this.getRemoteInfo(event);
        device.versionInformation = version;
        device.leRemoteFeatures = features;
      }

      debug('Remote Version Information', JSON.stringify(device.versionInformation));
      debug('Remote Features', device.leRemoteFeatures.leFeatures.toString());

      const gapEvent = this.createGapConnectedEvent(event.connectionHandle);
      assert(gapEvent);

      debug('Connected to', event.peerAddress.toString());

      this.emit('GapConnected', gapEvent);
    } catch (err) {
      this.hci.disconnect(event.connectionHandle)
        .catch(() => {});
      debug(err);
    }
  }

  private async getRemoteInfo(connComplete: LeConnectionCompleteEvent | LeEnhConnectionCompleteEvent) {
    // NOTE: don't know why but sometimes first request to remote device gives no response
    //       so we try to read remote version information twice
    //       problem occurs on nRF52840 Dongle with HCI controller

    const timeoutMs = connComplete.connectionIntervalMs * 10;

    let version: ReadRemoteVersionInformationCompleteEvent;
    try {
      version = await this.hci.readRemoteVersionInformationAwait(connComplete.connectionHandle, timeoutMs);
    } catch {
      version = await this.hci.readRemoteVersionInformationAwait(connComplete.connectionHandle, timeoutMs);
    }

    const features = await this.hci.leReadRemoteFeaturesAwait(connComplete.connectionHandle, timeoutMs);

    return { version, features };
  }

  private createGapConnectedEvent(connectionHandle: number): GapConnectEvent | null {
    const device = this.connectedDevices.get(connectionHandle);
    if (!device) {
      return null;
    }

    const conn = device.connComplete;
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

    if (this.extended && device.connComplete?.type === 'enhanced') {
      event.localResolvablePrivateAddress = device.connComplete?.localResolvablePrivateAddress;
      event.peerResolvablePrivateAddress = device.connComplete?.peerResolvablePrivateAddress;
    }

    return event;
  }

  private onLeChannelSelectionAlgorithm = async (_: Error|null, event: LeChannelSelAlgoEvent) => {
    debug('Channel selection algorithm detected', event.algorithm);
    const device = this.connectedDevices.get(event.connectionHandle);
    if (device) {
      device.channelSelectionAlgorithm = event;
    }
  };

  private onDisconnectionComplete = (_err: Error|null, event: DisconnectionCompleteEvent) => {
    const device = this.connectedDevices.get(event.connectionHandle);
    if (device) {
      this.connectedDevices.delete(event.connectionHandle);
    }

    this.emit('GapDisconnected', event);
  };
}
