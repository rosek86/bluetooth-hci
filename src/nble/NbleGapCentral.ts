import EventEmitter from "events";
import Debug from "debug";

import {
  GapAdvertReport,
  GapCentral,
  GapCentralOptions,
  GapConnectEvent,
  GapConnectParams,
  GapScanParamsOptions,
  GapScanStartOptions,
} from "../gap/GapCentral.js";
import { GapProfileStorage } from "../gap/GapProfileStorage.js";
import { GattClient } from "../gatt/GattClient.js";
import { Hci } from "../hci/Hci.js";
import { DisconnectionCompleteEvent } from "../hci/HciEvent.js";
import { LePhy } from "../hci/HciLeController.js";
import { Address } from "../utils/Address.js";
import { HciAdapter } from "../utils/HciAdapter.js";
import { printProfile } from "../utils/Profile.js";
import { HciError, HciErrorErrno } from "../hci/HciError.js";

const debug = Debug("NbleGapCentral");

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

  public constructor(protected adapter: HciAdapter, protected readonly options: GapCentralOptions = {}) {
    super();

    this.hci = adapter.Hci;

    this.gap = new GapCentral(this.hci, options);

    this.gap.on("GapLeScanState", (scanning) => debug("scanning", scanning));
    this.gap.on("GapLeAdvReport", (report) => this._onAdvert(report));
    this.gap.on("GapConnected", (event) => this._onConnected(event));
    this.gap.on("GapConnectionCancelled", () => this._onConnectionCancelled());
    this.gap.on("GapDisconnected", (reason) => this._onDisconnected(reason));
  }

  public async start() {
    await this.adapter.defaultAdapterSetup();

    await this.hci.leSetDefaultPhy({ txPhys: LePhy.Phy1M, rxPhys: LePhy.Phy1M });

    await this.gap.init();
  }

  protected async isScanning() {
    return this.gap.isScanning();
  }

  protected async startScanning(params?: GapScanParamsOptions, start?: GapScanStartOptions) {
    try {
      await this.gap.setScanParameters(params);
      await this.gap.startScanning(start);
    } catch (err) {
      if (err instanceof HciError && err.errno === HciErrorErrno.CommandDisallowed) {
        return; // ignore - already scanning
      }
    }
  }

  protected async stopScanning() {
    await this.gap.stopScanning();
  }

  protected isConnecting() {
    return this.gap.isConnecting();
  }

  protected async connect(connParams: GapConnectParams) {
    await this.gap.connect(connParams);
  }

  protected async disconnect(connectionHandle: number) {
    await this.hci.disconnect(connectionHandle);
  }

  protected saveProfile(address: Address, profile: GattClient["Profile"]) {
    GapProfileStorage.saveProfile(address, profile);
  }

  protected printProfile(profile: GattClient["Profile"]) {
    printProfile(profile);
  }

  private async _onAdvert(report: GapAdvertReport): Promise<void> {
    try {
      await this.onAdvert(report);
    } catch (e) {
      debug("onAdvert error", e);
      this.emit("error", e);
    }
  }
  protected abstract onAdvert(_: GapAdvertReport): Promise<void>;

  protected async _onConnected(event: GapConnectEvent): Promise<void> {
    try {
      const att = this.gap.getAtt(event.connectionHandle);

      const storeValue = GapProfileStorage.loadProfile(event.address);
      const gattClient = new GattClient(att, storeValue?.profile);

      await this.onConnected(event, gattClient);
    } catch (e) {
      debug("onConnected error", e);
      this.emit("error", e);
    }
  }
  protected abstract onConnected(event: GapConnectEvent, client: GattClient): Promise<void>;

  private async _onDisconnected(reason: DisconnectionCompleteEvent): Promise<void> {
    try {
      await this.onDisconnected(reason);
    } catch (e) {
      debug("onDisconnected error", e);
      this.emit("error", e);
    }
  }
  protected abstract onDisconnected(_: DisconnectionCompleteEvent): Promise<void>;

  private async _onConnectionCancelled(): Promise<void> {
    try {
      await this.onConnectionCancelled();
    } catch (e) {
      debug("onConnectionCancelled error", e);
      this.emit("error", e);
    }
  }
  protected abstract onConnectionCancelled(): Promise<void>;
}
