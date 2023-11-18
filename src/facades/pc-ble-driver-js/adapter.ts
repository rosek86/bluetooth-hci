import EventEmitter from "events";
import { HciAdapter } from "../../utils/HciAdapter.js";
import { LeOwnAddressType, LeScanFilterDuplicates, LeScanType, LeScanningFilterPolicy } from "../../hci/HciLeController.js";
import { Address } from "../../utils/Address.js";
import { GapCentral } from "../../gap/GapCentral.js";

interface ScanParams {
  active: boolean;
  interval: number;
  window: number;
  timeout: number;
  use_whitelist?: number;
  adv_dir_report?: number;
}

interface AdData {
  BLE_GAP_AD_TYPE_FLAGS: string[];
  BLE_GAP_AD_TYPE_MANUFACTURER_SPECIFIC_DATA: number[];
  BLE_GAP_AD_TYPE_SERVICE_DATA: number[];
  BLE_GAP_AD_TYPE_COMPLETE_LOCAL_NAME: string | undefined;
}

interface Service {
  instanceId: string;
  deviceInstanceId: string;
  type: 'primary' | 'secondary';
  uuid: string;
  startHandle: number;
  endHandle: number;
}

interface Device {
  instanceId: string;
  address: string;
  addressType: string;
  role: 'peripheral' | 'central';
  connectionHandle?: unknown;
  connected?: boolean;
  txPower?: number;
  minConnectionInterval?: number;
  maxConnectionInterval?: number;
  slaveLatency?: number;
  connectionSupervisionTimeout?: number;
  paired?: boolean;
  name?: string;
  rssi?: number;
  rssi_level?: number;
  advType?: string;
  adData?: AdData;
  services?: Service[];
  flags?: string[];
  scanResponse?: boolean;
  time?: Date;

  // ownPeriphInitiatedPairingPending: boolean;
  // processEventData(evt: ProcessEventData): void;
}

export class PcBleDriverJsAdapter extends EventEmitter {
  private gap: GapCentral;

  constructor(private hciAdapter: HciAdapter) {
    super();
    this.gap = new GapCentral(hciAdapter.Hci);
  }

  public async open(): Promise<void> {
    const hci = this.hciAdapter.Hci;

    await hci.reset();

    const localVersion = await hci.readLocalVersionInformation();
    console.log('Local Version:', localVersion);
    // console.log('Manufacturer:', this.manufacturerNameFromCode(localVersion.manufacturerName));

    const localCommands = await hci.readLocalSupportedCommands();
    console.log('Local Supported Commands:', localCommands.toStringSorted());

    const localFeatures = await hci.readLocalSupportedFeatures();
    console.log('Local Supported Features', localFeatures);

    if (localFeatures.leSupported === false) {
      throw new Error('LE not supported');
    }

    const leFeatures = await hci.leReadLocalSupportedFeatures();
    console.log('LE Features:', leFeatures.toString());

    const leStates = await hci.leReadSupportedStates();
    console.log('LE States:', leStates);

    if (localCommands.isSupported('readBdAddr')) {
      const bdAddress = await hci.readBdAddr();
      console.log('BD Address:', bdAddress.toString());
    }

    if (localCommands.isSupported('leReadTransmitPower')) {
      const leTransmitPower = await hci.leReadTransmitPower();
      console.log(`LE Transmit Power:`, leTransmitPower);
    }

    const leBufferSize = await hci.leReadBufferSize();
    console.log('LE Buffer Size:', leBufferSize);

    await hci.setEventMask({
      disconnectionComplete:                true,
      encryptionChange:                     true,
      encryptionKeyRefreshComplete:         true,
      readRemoteVersionInformationComplete: true,
      leMeta:                               true,
    });
    await hci.setEventMaskPage2({});

    const extendedScan = localCommands.Commands.leSetExtendedScanEnable;
    const extendedConnection = localCommands.Commands.leExtendedCreateConnectionV1;

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
      console.log(`Whitelist size: ${await hci.leReadWhiteListSize()}`);
      await hci.leClearWhiteList();
    }

    if (localCommands.isSupported('leReadResolvingListSize')) {
      console.log(`Resolving List size: ${await hci.leReadResolvingListSize()}`);
      await hci.leClearResolvingList();
    }

    if (localCommands.isSupported('leReadNumberOfSupportedAdvertisingSets')) {
      const advSets = await hci.leReadNumberOfSupportedAdvertisingSets();
      console.log(`Number of supported advertising sets: ${advSets}`);
    }

    const maxDataLength = await hci.leReadMaximumDataLength();
    console.log(`Max data length: ${JSON.stringify(maxDataLength)}`);

    const suggestedMaxDataLength = await hci.leReadSuggestedDefaultDataLength();
    console.log(`Suggested max data length: ${JSON.stringify(suggestedMaxDataLength)}`);

    await hci.leWriteSuggestedDefaultDataLength({
      suggestedMaxTxOctets: 27,
      suggestedMaxTxTime: 328,
    });

    await hci.leSetRandomAddress(Address.random());

    await this.gap.init();

    this.gap.on('GapLeAdvReport', (report, raw) => {
      const adData: AdData = {
        BLE_GAP_AD_TYPE_FLAGS: [],
        BLE_GAP_AD_TYPE_COMPLETE_LOCAL_NAME: report.data.completeLocalName,
        BLE_GAP_AD_TYPE_MANUFACTURER_SPECIFIC_DATA: [],
        BLE_GAP_AD_TYPE_SERVICE_DATA: [],
      };

      if (report.data.manufacturerData) {
        const data = Buffer.alloc(2 + report.data.manufacturerData.data.length);
        data.writeUInt16LE(report.data.manufacturerData.ident, 0);
        report.data.manufacturerData.data.copy(data, 2);
        adData.BLE_GAP_AD_TYPE_MANUFACTURER_SPECIFIC_DATA = [ ...data ];
      }

      // TODO: store device in cache
      // TODO: fill device with data from report
      const device: Device = {
        instanceId: report.address.toString(),
        address: report.address.toString(),

        // BLE_GAP_ADV_TYPE_ADV_NONCONN_IND
        addressType: 'random', // TODO: expand address type
        role: 'peripheral',
        connected: false,
        adData
      };

      this.emit('deviceDiscovered', device, raw);
    });
    console.log('initialised');
  }

  async startScan(options: ScanParams, callback?: (err?: Error) => void) {
    try {
      await this.gap.setScanParameters({
        ownAddressType: LeOwnAddressType.RandomDeviceAddress,
        scanningFilterPolicy: LeScanningFilterPolicy.All,
        scanningPhy: {
          Phy1M: {
            type: options.active ? LeScanType.Active : LeScanType.Passive,
            intervalMs: options.interval,
            windowMs: options.window,
          },
        },
      });
      await this.gap.startScanning({
        durationMs: options.timeout,
        filterDuplicates: LeScanFilterDuplicates.Disabled,
      });
      callback?.();
    } catch (e) {
      if (e instanceof Error) {
        callback?.(e);
        throw e;
      }
    }
  }

  async stopScan(callback?: (err?: Error) => void) {
    try {
      await this.gap.stopScanning();
      callback?.();
    } catch (e) {
      if (e instanceof Error) {
        callback?.(e);
        throw e;
      }
    }
  }
}
