import { Hci } from '../../src/hci/Hci';
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

    const localFeatures = await hci.readLocalSupportedFeatures();
    console.log('Local Supported Features', localFeatures);

    if (localFeatures.leSupported === false) {
      throw new Error('LE not supported');
    }

    const localVersion = await hci.readLocalVersionInformation();
    console.log('Local Version', localVersion);

    const bdAddress = await hci.readBdAddr();
    console.log('BD Address:', bdAddress.toString());

    const leTransmitPower = await hci.leReadTransmitPower();
    console.log(`LE Transmit Power:`, leTransmitPower);

    const leBufferSize = await hci.leReadBufferSize();
    console.log('LE Buffer Size:', leBufferSize);

    const leFeatures = await hci.leReadLocalSupportedFeatures();
    console.log('LE Features:', leFeatures);

    const leStates = await hci.leReadSupportedStates();
    console.log('LE States:', leStates);

    const localCommands = await hci.readLocalSupportedCommands();

    console.log('Local Supported Commands:')
    for (const [key, value] of Object.entries(localCommands)) {
      if (value === true) {
        console.log(key);
      }
    }

    await hci.setEventMask({
      disconnectionComplete:                true,
      encryptionChange:                     true,
      encryptionKeyRefreshComplete:         true,
      readRemoteVersionInformationComplete: true,
      leMeta:                               true,
    });
    await hci.setEventMaskPage2({});
    await hci.leSetEventMask({
      connectionComplete:                   false,
      advertisingReport:                    false,
      connectionUpdateComplete:             true,
      readRemoteFeaturesComplete:           true,
      longTermKeyRequest:                   true,
      remoteConnectionParameterRequest:     true,
      dataLengthChange:                     true,
      readLocalP256PublicKeyComplete:       true,
      generateDhKeyComplete:                true,
      enhancedConnectionComplete:           true,
      directedAdvertisingReport:            true,
      phyUpdateComplete:                    true,
      extendedAdvertisingReport:            true,
      scanTimeout:                          true,
      advertisingSetTerminated:             true,
      channelSelectionAlgorithm:            true,
    });

    console.log(`Whitelist size: ${await hci.leReadWhiteListSize()}`);
    await hci.leClearWhiteList();

    console.log(`Resolving List size: ${await hci.leReadResolvingListSize()}`);
    await hci.leClearResolvingList();

    const advSets = await hci.leReadNumberOfSupportedAdvertisingSets();
    console.log(`Number of supported advertising sets: ${advSets}`);

    const maxDataLength = await hci.leReadMaximumDataLength();
    console.log(`Max data length: ${JSON.stringify(maxDataLength)}`);

    const suggestedMaxDataLength = await hci.leReadSuggestedDefaultDataLength();
    console.log(`Suggested max data length: ${JSON.stringify(suggestedMaxDataLength)}`);

    await hci.leWriteSuggestedDefaultDataLength({
      suggestedMaxTxOctets: 27,
      suggestedMaxTxTime:   328,
    });
  }
}
