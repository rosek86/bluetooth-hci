import EventEmitter from "events";
import { HciAdapter, SerialHciDevice } from "../../examples/utils/HciAdapterFactory";
import { LeOwnAddressType, LeScanType, LeScanningFilterPolicy } from "../../src/hci/HciLeController";
import { LeAdvReport } from "../../src/hci/HciEvent";
import { Address, AddressType } from "../../src/utils/Address";

interface ScanParams {
  active: boolean;
  interval: number;
  window: number;
  timeout: number;
  use_whitelist?: number;
  adv_dir_report?: number;
}

export class Adapter extends EventEmitter {
  private device: SerialHciDevice;
  private hciAdapter: HciAdapter;
  private scanning: boolean = false;

  constructor(port: string) {
    super();
    this.device = new SerialHciDevice(port);
    this.hciAdapter = new HciAdapter(this.device);
  }

  public async init(): Promise<void> {
    const hci = this.hciAdapter.Hci;
    await this.hciAdapter.open();

    await hci.reset();

    // const localVersion = await hci.readLocalVersionInformation();
    const localCommands = await hci.readLocalSupportedCommands();
    const localFeatures = await hci.readLocalSupportedFeatures();

    if (localFeatures.leSupported === false) {
      throw new Error('LE not supported');
    }

    // const leFeatures = await hci.leReadLocalSupportedFeatures();

    // const leStates = await hci.leReadSupportedStates();

    // if (localCommands.isSupported('readBdAddr')) {
    //   const bdAddress = await hci.readBdAddr();
    // }

    // if (localCommands.isSupported('leReadTransmitPower')) {
    //   const leTransmitPower = await hci.leReadTransmitPower();
    // }

    // const leBufferSize = await hci.leReadBufferSize();
    // console.log('LE Buffer Size:', leBufferSize);

    await hci.setEventMask({
      disconnectionComplete:                true,
      encryptionChange:                     true,
      encryptionKeyRefreshComplete:         true,
      readRemoteVersionInformationComplete: true,
      leMeta:                               true,
    });
    await hci.setEventMaskPage2({});

    const extendedScan = localCommands.Commands.leSetExtendedScanEnable;
    const extendedConnection = localCommands.Commands.leExtendedCreateConnection;

    await hci.leSetEventMask({
      connectionComplete:                   !extendedConnection,
      advertisingReport:                    !extendedScan,
      connectionUpdateComplete:             true,
      readRemoteFeaturesComplete:           true,
      longTermKeyRequest:                   true,
      remoteConnectionParameterRequest:     true,
      dataLengthChange:                     true,
      readLocalP256PublicKeyComplete:       true,
      generateDhKeyComplete:                true,
      enhancedConnectionComplete:           extendedConnection,
      directedAdvertisingReport:            true,
      phyUpdateComplete:                    true,
      extendedAdvertisingReport:            extendedScan,
      scanTimeout:                          true,
      advertisingSetTerminated:             true,
      channelSelectionAlgorithm:            true,
    });

    if (localCommands.isSupported('leReadWhiteListSize')) {
      await hci.leClearWhiteList();
    }

    if (localCommands.isSupported('leReadResolvingListSize')) {
      await hci.leClearResolvingList();
    }

    await hci.leWriteSuggestedDefaultDataLength({
      suggestedMaxTxOctets: 27,
      suggestedMaxTxTime: 328,
    });

    await hci.leSetRandomAddress(Address.random());

    this.hciAdapter.Hci.on('LeAdvertisingReport', this.leAdvertisingReportHandler);
  }

  private leAdvertisingReportHandler = (report: LeAdvReport) => {
    console.log(report);
  };

  async startScan(options: ScanParams, callback?: (err?: Error) => void) {
    try {
      const type = options.active ? LeScanType.Active : LeScanType.Passive;
      const scanningFilterPolicy = options.use_whitelist ?
        LeScanningFilterPolicy.FromWhiteList :
        LeScanningFilterPolicy.All;
      await this.hciAdapter.Hci.leSetScanParameters({
        type,
        intervalMs: options.interval,
        windowMs: options.window,
        ownAddressType: LeOwnAddressType.RandomDeviceAddress,
        scanningFilterPolicy,
      });
      await this.hciAdapter.Hci.leSetScanEnable(true, false);
      this.scanning = true;
    } catch (e) {
      callback?.(e);
      throw e;
    }
  }

  async stopScan(callback?: (err?: Error) => void) {
    try {
      await this.hciAdapter.Hci.leSetScanEnable(false);
      this.scanning = false;
    } catch (e) {
      callback?.(e);
      throw e;
    }
  }
}
