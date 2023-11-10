import { Hci } from '../../src/hci/Hci';
import { Address } from '../../src/utils/Address';
import { ArgsParser, DefaultInputArgs } from './ArgsParser';
import { HciAdapter, HciAdapterFactory } from './HciAdapterFactory';

import companies from '../assigned numbers/Company Identifiers.json';

export class HciAdapterUtils {
  public static async createHciAdapter(defaults?: DefaultInputArgs): Promise<HciAdapter> {
    const argsParser = new ArgsParser();

    const args = await argsParser.getInputArgs(defaults);
    if (!args) {
      throw new Error('Invalid input parameters');
    }

    const adapterOptions = argsParser.getAdapterOptions(args);
    if (!adapterOptions) {
      throw new Error('Invalid input parameters');
    }

    const adapter = await HciAdapterFactory.create(adapterOptions);
    await adapter.open();

    return adapter;
  }

  public static async defaultAdapterSetup(hci: Hci): Promise<void> {
    await hci.reset();

    const [localVersion, localCommands, localFeatures] = await Promise.all([
      hci.readLocalVersionInformation(),
      hci.readLocalSupportedCommands(),
      hci.readLocalSupportedFeatures(),
    ]);
    console.log('Local Version:', localVersion);
    console.log('Manufacturer:', this.manufacturerNameFromCode(localVersion.manufacturerName));
    console.log('Local Supported Commands:', Object.entries(localCommands.Commands).filter(([_, value]) => value).map(([key]) => key));
    console.log('Local Supported Features', Object.entries(localFeatures).filter(([_, value]) => value).map(([key]) => key));

    if (localCommands.isSupported('readBdAddr')) {
      const bdAddress = await hci.readBdAddr();
      console.log('BD Address:', bdAddress.toString());
    }

    if (localFeatures.leSupported === false) {
      throw new Error('LE not supported');
    }

    const [leFeatures, leStates, leBufferSize] = await Promise.all([
      hci.leReadLocalSupportedFeatures(),
      hci.leReadSupportedStates(),
      hci.leReadBufferSize(),
    ]);
    console.log('LE Features:', Object.entries(leFeatures.Features).filter(([_, value]) => value).map(([key]) => key));
    console.log('LE States:', leStates);
    console.log('LE Buffer Size:', leBufferSize);

    if (localCommands.isSupported('leReadTransmitPower')) {
      const leTransmitPower = await hci.leReadTransmitPower();
      console.log(`LE Transmit Power:`, leTransmitPower);
    }

    await Promise.all([
      hci.setEventMask({
        disconnectionComplete:                true,
        encryptionChange:                     true,
        encryptionKeyRefreshComplete:         true,
        readRemoteVersionInformationComplete: true,
        leMeta:                               true,
      }),
      hci.setEventMaskPage2({})
    ]);

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

    await hci.leSetRandomAddress(Address.from(0x153c7f2c4b82));

    console.log('initialised');
  }

  public static manufacturerNameFromCode(code: number): string | undefined {
    const hexcode = code.toString(16).padStart(4, '0');
    const manufacturers = Object.entries(companies.entries)
      .filter(([k]) => k === hexcode)
      .map(([_,v]) => v);
    return manufacturers.at(0);
  }
}
