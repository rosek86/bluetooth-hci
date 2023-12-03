import EventEmitter from "node:events";
import { Hci } from "../hci/Hci.js";
import { H4 } from "../transport/H4.js";
import { Address } from "./Address.js";
import { getCompanyName } from '../../assigned-numbers/Company Identifiers.js';

export interface HciDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  write(data: Buffer): void;
  on(evt: 'data', listener: (data: Buffer) => void): void;
  on(evt: 'error', listener: (data: NodeJS.ErrnoException) => void): void;
}

export class HciAdapter extends EventEmitter {
  private readonly hci: Hci;
  private readonly h4: H4;

  constructor(private device: HciDevice) {
    super();

    this.hci = new Hci({
      send: (packetType, data) => {
        const packet = Buffer.concat([Buffer.from([packetType]), data, Buffer.from([0])]);
        device.write(packet);
      },
    });

    this.h4 = new H4();

    device.on('data', (data) => {
      let result = this.h4.parse(data);
      do {
        if (result) {
          this.hci.onData(result.type, result.packet);
          result = this.h4.parse(Buffer.alloc(0));
        }
      } while (result);
    });

    device.on('error', (err) => this.emit('error', err));
  }

  public async open() {
    await this.device.open();
  }

  public async close() {
    await this.device.close();
  }

  public write(data: Buffer) {
    this.device.write(data);
  }

  public get Hci(): Hci {
    return this.hci;
  }

  public async defaultAdapterSetup(): Promise<void> {
    await this.hci.reset();

    const [localVersion, localCommands, localFeatures] = await Promise.all([
      this.hci.readLocalVersionInformation(),
      this.hci.readLocalSupportedCommands(),
      this.hci.readLocalSupportedFeatures(),
    ]);
    console.log('Local Version:', localVersion);
    console.log('Manufacturer:', this.manufacturerNameFromCode(localVersion.manufacturerName));
    console.log('Local Supported Commands:', Object.entries(localCommands.Commands).filter(([, value]) => value).map(([key]) => key));
    console.log('Local Supported Features', Object.entries(localFeatures).filter(([, value]) => value).map(([key]) => key));

    if (localCommands.isSupported('readBdAddr')) {
      const bdAddress = await this.hci.readBdAddr();
      console.log('BD Address:', bdAddress.toString());
    }

    if (localFeatures.leSupported === false) {
      throw new Error('LE not supported');
    }

    const [leFeatures, leStates, leBufferSize] = await Promise.all([
      this.hci.leReadLocalSupportedFeatures(),
      this.hci.leReadSupportedStates(),
      this.hci.leReadBufferSize(),
    ]);
    console.log('LE Features:', Object.entries(leFeatures.Features).filter(([, value]) => value).map(([key]) => key));
    console.log('LE States:', leStates);
    console.log('LE Buffer Size:', leBufferSize);

    if (localCommands.isSupported('leReadTransmitPower')) {
      const leTransmitPower = await this.hci.leReadTransmitPower();
      console.log(`LE Transmit Power:`, leTransmitPower);
    }

    await Promise.all([
      this.hci.setEventMask({
        disconnectionComplete:                true,
        encryptionChange:                     true,
        encryptionKeyRefreshComplete:         true,
        readRemoteVersionInformationComplete: true,
        leMeta:                               true,
      }),
      this.hci.setEventMaskPage2({})
    ]);

    const extendedScan = localCommands.Commands.leSetExtendedScanEnable;
    const extendedConnection = localCommands.Commands.leExtendedCreateConnectionV1;

    await this.hci.leSetEventMask({
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
      console.log(`Whitelist size: ${await this.hci.leReadWhiteListSize()}`);
      await this.hci.leClearWhiteList();
    }

    if (localCommands.isSupported('leReadResolvingListSize')) {
      console.log(`Resolving List size: ${await this.hci.leReadResolvingListSize()}`);
      await this.hci.leClearResolvingList();
    }

    if (localCommands.isSupported('leReadNumberOfSupportedAdvertisingSets')) {
      const advSets = await this.hci.leReadNumberOfSupportedAdvertisingSets();
      console.log(`Number of supported advertising sets: ${advSets}`);
    }

    const maxDataLength = await this.hci.leReadMaximumDataLength();
    console.log(`Max data length: ${JSON.stringify(maxDataLength)}`);

    const suggestedMaxDataLength = await this.hci.leReadSuggestedDefaultDataLength();
    console.log(`Suggested max data length: ${JSON.stringify(suggestedMaxDataLength)}`);

    await this.hci.leWriteSuggestedDefaultDataLength({
      suggestedMaxTxOctets: 27,
      suggestedMaxTxTime: 328,
    });

    await this.hci.leSetRandomAddress(Address.from(0x153c7f2c4b82));

    console.log('initialised');
  }

  public manufacturerNameFromCode(code: number): string | undefined {
    return getCompanyName(code);
  }
}
