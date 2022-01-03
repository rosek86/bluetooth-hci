import { Adapter, AdapterParams, HciAdapterFactory } from '../HciAdapterFactory';
import { H4 } from '../../src/transport/H4';
import { Hci } from '../../src/hci/Hci';
import { Address } from '../../src/utils/Address';
import { AdvData } from '../../src/gap/AdvData';

import {
  LeAdvertisingEventProperties,
  LeAdvertisingChannelMap,
  LeOwnAddressType,
  LePeerAddressType,
  LeAdvertisingFilterPolicy,
  LePrimaryAdvertisingPhy,
  LeSecondaryAdvertisingPhy,
  LeAdvertisingDataOperation,
} from '../../src/hci/HciLeController';

(async () => {
  try {
    const adapter = await createHciAdapter();

    const hci = new Hci({
      send: (packetType, data) => {
        adapter.write(Buffer.from([packetType, ...data]));
      },
    });

    const h4 = new H4();

    adapter.on('data', (data) => {
      let result = h4.parse(data);
      do {
        if (result) {
          hci.onData(result.type, result.packet);
          result = h4.parse(Buffer.allocUnsafe(0));
        }
      } while (result);
    });
    adapter.on('error', (err) => {
      console.log(err);
    });

    await hci.reset();

    const localFeatures = await hci.readLocalSupportedFeatures();
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

    console.log('Supported commands:')
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
    await hci.setEventMaskPage2({
    });
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

    const advSets = await hci.leReadNumberOfSupportedAdvertisingSets();
    console.log(`Number of supported advertising sets: ${advSets}`);

    await hci.leSetRandomAddress(Address.from(0x153c7f2c4b82));

    const selectedTxPower = await hci.leSetExtendedAdvertisingParameters(0, {
      advertisingEventProperties: [
        LeAdvertisingEventProperties.Connectable,
      ],
      primaryAdvertisingIntervalMinMs: 500,
      primaryAdvertisingIntervalMaxMs: 1000,
      primaryAdvertisingChannelMap: [
        LeAdvertisingChannelMap.Channel37,
        LeAdvertisingChannelMap.Channel38,
        LeAdvertisingChannelMap.Channel39,
      ],
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      peerAddressType: LePeerAddressType.PublicDeviceAddress,
      peerAddress: Address.from(0x000000000000),
      advertisingFilterPolicy: LeAdvertisingFilterPolicy.Any,
      primaryAdvertisingPhy: LePrimaryAdvertisingPhy.PhyCoded,
      secondaryAdvertisingMaxSkip: 0,
      secondaryAdvertisingPhy: LeSecondaryAdvertisingPhy.PhyCoded,
      advertisingSid: 0,
      scanRequestNotificationEnable: false,
      advertisingTxPower: 8,
    });
    console.log(`TX Power: ${selectedTxPower}`);

    await hci.leSetAdvertisingSetRandomAddress(0, Address.from(0x1429c386d3a9));

    const advertisingData = AdvData.build({
      flags: 6,
      completeLocalName: 'Zephyr Ctrl',
      manufacturerData: {
        ident: 0x0689,
        data: Buffer.from([41, 0]),
      }
    });
    await hci.leSetExtendedAdvertisingData(0, {
      operation: LeAdvertisingDataOperation.Complete,
      fragment: false,
      data: advertisingData,
    });

    // NOTE: Scan response not supported on CodedPHY

    await hci.leSetExtendedAdvertisingEnable({
      enable: true,
      sets: [{ advertHandle: 0 }],
    });
    console.log('end');

  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  } finally {
    // port.close();
  }
})();

async function createHciAdapter(): Promise<Adapter> {
  // const adapterOptions: AdapterParams = {
  //   type: 'serial',
  //   serial: {
  //     autoOpen: false,
  //     baudRate: 1000000,
  //     dataBits: 8,
  //     parity: 'none',
  //     stopBits: 1,
  //     rtscts: true,
  //   },
  // };
  const adapterOptions: AdapterParams = {
    type: 'usb',
    usb: {
      vid: 0x2fe3,
      pid: 0x000d,
    }
  };

  return HciAdapterFactory.create(adapterOptions);
}
