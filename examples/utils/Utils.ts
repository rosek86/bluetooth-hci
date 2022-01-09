import { Hci } from '../../src/hci/Hci';
import { Address, AddressType } from '../../src/utils/Address';
import { ArgsParser, DefaultInputArgs } from './ArgsParser';
import { Adapter, HciAdapterFactory } from './HciAdapterFactory';

export class Utils {
  public static async createHciAdapter(defaults?: DefaultInputArgs): Promise<Adapter> {
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

    const localVersion = await hci.readLocalVersionInformation();
    console.log('Local Version', localVersion);

    const localCommands = await hci.readLocalSupportedCommands();
    console.log('Local Supported Commands:', localCommands.toString());

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

    await hci.leSetRandomAddress(Address.from(0x153c7f2c4b82, AddressType.Random));

    console.log('initialised');
  }
}
