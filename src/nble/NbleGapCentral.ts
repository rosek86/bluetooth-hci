import { Utils } from "../../examples/utils/Utils";
import { GapAdvertReport, GapCentral, GapConnectEvent, GapScanParamsOptions, GapScanStartOptions } from "../gap/GapCentral";
import { GapProfileStorage } from "../gap/GapProfileStorage";
import { GattClient } from "../gatt/GattClient";
import { Hci } from "../hci/Hci";
import { DisconnectionCompleteEvent } from "../hci/HciEvent";
import { LePhy, LeScanFilterDuplicates } from "../hci/HciLeController";
import { Address } from "../utils/Address";

export interface NbleGapCentralOptions {
  autoscan?: boolean;
  autoScanOptions?: {
    scanWhenConnected?: boolean;
    parameters?: GapScanParamsOptions;
    start?: GapScanStartOptions;
  };
}

export abstract class NbleGapCentral {
  protected readonly gap: GapCentral;

  public constructor(protected hci: Hci, protected readonly options: NbleGapCentralOptions = {}) {
    options.autoscan = options.autoscan ?? true;
    options.autoScanOptions = options.autoScanOptions ?? {};
    options.autoScanOptions.scanWhenConnected = options.autoScanOptions.scanWhenConnected ?? false;
    options.autoScanOptions.start = options.autoScanOptions.start ?? {
      filterDuplicates: LeScanFilterDuplicates.Enabled,
    };
  
    this.gap = new GapCentral(hci, {
      cacheRemoteInfo: true,
    });

    this.gap.on('GapLeScanState',          (scanning) => console.log('scanning', scanning));
    this.gap.on('GapLeAdvReport',          (report)   => this._onAdvert(report));
    this.gap.on('GapConnected',            (event)    => this._onConnected(event));
    this.gap.on('GapConnectionCancelled',  ()         => this._onConnectionCancelled());
    this.gap.on('GapDisconnected',         (reason)   => this._onDisconnected(reason));
  }

  public async start() {
    // TODO: migrate default setup from examples
    await Utils.defaultAdapterSetup(this.hci);

    await this.hci.leSetDefaultPhy({ txPhys: LePhy.Phy1M, rxPhys: LePhy.Phy1M });

    await this.gap.init();
    
    if (this.options.autoscan) {
      await this.startScanning();
    }
  }

  public async startScanning(opts?: GapScanParamsOptions) {
    await this.gap.setScanParameters(opts);
    await this.gap.startScanning({ filterDuplicates: LeScanFilterDuplicates.Enabled });
  }

  public async stopScanning() {
    await this.gap.stopScanning();
  }

  public async connect(address: Address, connectionTimeoutMs: number) {
    await this.stopScanning();
    await this.gap.connect({ peerAddress: address }, connectionTimeoutMs);
  }

  public async disconnect(connectionHandle: number) {
    await this.hci.disconnect(connectionHandle);
  }

  public async discover(params: { connectionHandle: number; address: Address }) {
    const storeValue = GapProfileStorage.loadProfile(params.address);
    const att = this.gap.getAtt(params.connectionHandle);
    const gatt = new GattClient(att, storeValue?.profile);
    const profile = await gatt.discover();
    GapProfileStorage.saveProfile(params.address, profile);
    return gatt;
  }

  private async _onAdvert(report: GapAdvertReport): Promise<void> {
    try {
      await this.onAdvert(report);
    } catch (e) {
      console.log(e);
    }
  }
  protected async onAdvert(_: GapAdvertReport): Promise<void> {}

  protected async _onConnected(event: GapConnectEvent): Promise<void> {
    await Promise.allSettled([
      this.onConnected(event),
      Promise.resolve().then(() => {
        if (this.options.autoscan && this.options.autoScanOptions?.scanWhenConnected === true) {
          return this.startScanning();
        }
      }),
      this.discover(event).then((gatt) => {
        this.onServicesDiscovered(event, gatt);
      }),
    ]);
  }
  protected async onConnected(_: GapConnectEvent): Promise<void> {}

  protected async onServicesDiscovered(_e: GapConnectEvent, _p: GattClient): Promise<void> {}

  private async _onDisconnected(reason: DisconnectionCompleteEvent): Promise<void> {
    await Promise.allSettled([
      this.onDisconnected(reason),
      Promise.resolve().then(() => {
        if (this.options.autoscan && this.options.autoScanOptions?.scanWhenConnected === false) {
          return this.startScanning();
        }
      }),
    ]);
  }
  protected async onDisconnected(_: DisconnectionCompleteEvent): Promise<void> {}

  private async _onConnectionCancelled(): Promise<void> {
    if (this.options.autoscan) {
      await this.startScanning()
        .catch((err) => console.log('connection cancelled - start scanning', err));
    }
    await this.onConnectionCancelled();
  }
  protected async onConnectionCancelled(): Promise<void> {}
}
