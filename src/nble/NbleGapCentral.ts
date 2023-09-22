import { GapAdvertReport, GapCentral, GapConnectEvent, GapScanParamsOptions, GapScanStartOptions } from "../gap/GapCentral";
import { Hci } from "../hci/Hci";
import { DisconnectionCompleteEvent } from "../hci/HciEvent";
import { LeScanFilterDuplicates } from "../hci/HciLeController";
import { Address } from "../utils/Address";

export interface NbleGapCentralOptions {
  autoscan?: boolean;
  scanOptions?: {
    parameters?: GapScanParamsOptions;
    start?: GapScanStartOptions;
  };
}

export abstract class NbleGapCentral {
  protected readonly gap: GapCentral;

  public constructor(protected hci: Hci, protected readonly options: NbleGapCentralOptions = {}) {
    options.autoscan = options.autoscan ?? true;
    options.scanOptions = options.scanOptions ?? {
      start: { filterDuplicates: LeScanFilterDuplicates.Enabled },
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

  protected async _onAdvert(report: GapAdvertReport): Promise<void> {
    try {
      await this.onAdvert(report);
    } catch (e) {
      console.log(e);
    }
  }
  protected async onAdvert(report: GapAdvertReport): Promise<void> {}

  protected async _onConnected(event: GapConnectEvent): Promise<void> {
    try {
      await this.onConnected(event);
    } catch (e) {
      console.log(e);
    }
  }
  protected async onConnected(event: GapConnectEvent): Promise<void> {}

  private async _onDisconnected(reason: DisconnectionCompleteEvent): Promise<void> {
    if (this.options.autoscan) {
      this.startScanning()
        .catch((err) => console.log('disconnected', err));
    }
    await this.onDisconnected(reason);
  }
  protected async onDisconnected(reason: DisconnectionCompleteEvent): Promise<void> {}

  private async _onConnectionCancelled(): Promise<void> {
    if (this.options.autoscan) {
      this.startScanning()
        .catch((err) => console.log('connection cancelled - start scanning', err));
    }
    await this.onConnectionCancelled();
  }
  protected async onConnectionCancelled(): Promise<void> {}
}
