import EventEmitter from "events";
import Debug from "debug";

import { GapAdvertReport, GapCentral, GapConnectEvent, GapConnectParams, GapScanParamsOptions, GapScanStartOptions } from "../gap/GapCentral.js";
import { GapProfileStorage } from "../gap/GapProfileStorage.js";
import { GattClient } from "../gatt/GattClient.js";
import { Hci } from "../hci/Hci.js";
import { DisconnectionCompleteEvent } from "../hci/HciEvent.js";
import { LeOwnAddressType, LePhy, LeScanFilterDuplicates, LeScanType, LeScanningFilterPolicy } from "../hci/HciLeController.js";
import { Address } from "../utils/Address.js";
import { HciAdapter } from "../utils/HciAdapter.js";
import { printProfile } from "../utils/Profile.js";

const debug = Debug('NbleGapCentral');

export interface NbleGapCentralOptions {
  autoScan?: boolean;
  autoScanOptions?: {
    scanWhenConnected?: boolean;
    parameters?: GapScanParamsOptions;
    start?: GapScanStartOptions;
  };
}

export abstract class NbleGapCentral extends EventEmitter {
  protected readonly gap: GapCentral;
  protected readonly hci: Hci;

  public constructor(protected adapter: HciAdapter, protected readonly options: NbleGapCentralOptions = {}) {
    super();

    options.autoScan = options.autoScan ?? true;
    options.autoScanOptions = options.autoScanOptions ?? {};
    options.autoScanOptions.scanWhenConnected = options.autoScanOptions.scanWhenConnected ?? false;
    options.autoScanOptions.parameters = options.autoScanOptions.parameters ?? {
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.All,
      scanningPhy: {
        Phy1M: {
          type: LeScanType.Active,
          intervalMs: 100,
          windowMs: 100,
        },
      },
    };
    options.autoScanOptions.start = options.autoScanOptions.start ?? {
      filterDuplicates: LeScanFilterDuplicates.Enabled,
    };

    this.hci = adapter.Hci;
  
    this.gap = new GapCentral(this.hci, {
      cacheRemoteInfo: true,
    });

    this.gap.on('GapLeScanState',          (scanning) => debug('scanning', scanning));
    this.gap.on('GapLeAdvReport',          (report)   => this._onAdvert(report));
    this.gap.on('GapConnected',            (event)    => this._onConnected(event));
    this.gap.on('GapConnectionCancelled',  ()         => this._onConnectionCancelled());
    this.gap.on('GapDisconnected',         (reason)   => this._onDisconnected(reason));
  }

  public async start() {
    await this.adapter.defaultAdapterSetup();

    await this.hci.leSetDefaultPhy({ txPhys: LePhy.Phy1M, rxPhys: LePhy.Phy1M });

    await this.gap.init();
    
    if (this.options.autoScan) {
      await this.startScanning();
    }
  }

  protected async startScanning(params?: GapScanParamsOptions, start?: GapScanStartOptions) {
    if (!params && this.options.autoScan && this.options.autoScanOptions?.parameters) {
      params = this.options.autoScanOptions.parameters;
    }
    if (!start && this.options.autoScan && this.options.autoScanOptions?.start) {
      start = this.options.autoScanOptions.start;
    }
    await this.gap.setScanParameters(params);
    await this.gap.startScanning(start);
  }

  protected async stopScanning() {
    await this.gap.stopScanning();
  }

  protected async connect(connParams: GapConnectParams) {
    await this.stopScanning();
    await this.gap.connect(connParams).catch(async (e) => {
      if (this.options.autoScan) {
        await this.startScanning();
      }
      throw e;
    });
  }

  protected async disconnect(connectionHandle: number) {
    await this.hci.disconnect(connectionHandle);
  }

  protected saveProfile(address: Address, profile: GattClient['Profile']) {
    GapProfileStorage.saveProfile(address, profile);
  }

  protected printProfile(profile: GattClient['Profile']) {
    printProfile(profile);
  }

  private async _onAdvert(report: GapAdvertReport): Promise<void> {
    try {
      await this.onAdvert(report);
    } catch (e) {
      debug('onAdvert error', e);
      this.emit('error', e);
    }
  }
  protected abstract onAdvert(_: GapAdvertReport): Promise<void>;

  protected async _onConnected(event: GapConnectEvent): Promise<void> {
    try {
      const att = this.gap.getAtt(event.connectionHandle);

      const storeValue = GapProfileStorage.loadProfile(event.address);
      const gattClient = new GattClient(att, storeValue?.profile);

      await Promise.all([
        this.onConnected(event, gattClient),
        Promise.resolve().then(() => {
          if (this.options.autoScan && this.options.autoScanOptions?.scanWhenConnected === true) {
            return this.startScanning();
          }
        }),
      ]);
    } catch (e) {
      debug('onConnected error', e);
      this.emit('error', e);
    }
  }
  protected abstract onConnected(event: GapConnectEvent, client: GattClient): Promise<void>;

  private async _onDisconnected(reason: DisconnectionCompleteEvent): Promise<void> {
    try {
      await Promise.all([
        this.onDisconnected(reason),
        Promise.resolve().then(() => {
          if (this.options.autoScan && this.options.autoScanOptions?.scanWhenConnected === false) {
            return this.startScanning();
          }
        }),
      ]);
    } catch (e) {
      debug('onDisconnected error', e);
      this.emit('error', e);
    }
  }
  protected abstract onDisconnected(_: DisconnectionCompleteEvent): Promise<void>;

  private async _onConnectionCancelled(): Promise<void> {
    try {
      await Promise.all([
        this.onConnectionCancelled(),
        Promise.resolve().then(() => {
          if (this.options.autoScan) {
            return this.startScanning();
          }
        }),
      ]);
    } catch (e) {
      debug('onConnectionCancelled error', e);
      this.emit('error', e);
    }
  }
  protected abstract onConnectionCancelled(): Promise<void>;
}
