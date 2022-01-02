import { Adapter, AdapterParams, HciAdapterFactory } from './HciAdapterFactory';
import { H4 } from '../src/transport/H4';
import { Hci } from '../src/hci/Hci';
import { Address } from '../src/utils/Address';
import { AdvData } from '../src/gap/AdvData';

import { Gap } from '../src/gap/Gap';
import { L2CAP } from '../src/l2cap/L2CAP';

import {
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates,
  LeWhiteListAddressType,
  LeWhiteList,
} from '../src/hci/HciLeController';
import { LeExtAdvReport } from '../src/hci/HciEvent';

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
    console.log(localVersion);

    const bdAddress = await hci.readBdAddr();
    console.log(bdAddress.toString());

    const leTransmitPower = await hci.leReadTransmitPower();
    console.log(`LE Transmit Power:`, leTransmitPower);

    const leBufferSize = await hci.leReadBufferSize();
    console.log(leBufferSize);

    const leFeatures = await hci.leReadLocalSupportedFeatures();
    console.log(leFeatures);

    const leStates = await hci.leReadSupportedStates();
    console.log(leStates);

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
    await hci.setEventMaskPage2({});

    await hci.leSetEventMask({
      connectionComplete:               false,
      advertisingReport:                false,
      connectionUpdateComplete:         true,
      readRemoteFeaturesComplete:       true,
      longTermKeyRequest:               true,
      remoteConnectionParameterRequest: true,
      dataLengthChange:                 true,
      readLocalP256PublicKeyComplete:   true,
      generateDhKeyComplete:            true,
      enhancedConnectionComplete:       true,
      directedAdvertisingReport:        true,
      phyUpdateComplete:                true,
      extendedAdvertisingReport:        true,

      scanTimeout:                      true,
      channelSelectionAlgorithm:        true,
    });

    const key = Buffer.alloc(16);
    const data = Buffer.alloc(16);
    const result = await hci.leEncrypt(key, data);
    console.log(`Encrypted:`, result);

    const random = await hci.leRand();
    console.log(`Random:`, random);

    console.log(`Whitelist size: ${await hci.leReadWhiteListSize()}`);
    await hci.leClearWhiteList();

    const device: LeWhiteList = {
      addressType:  LeWhiteListAddressType.Random,
      address:      Address.from('F5:EF:D9:6E:47:C7'),
    }
    await hci.leAddDeviceToWhiteList(device);
    // await hci.leRemoveDeviceFromWhiteList(device);

    console.log(`Resolving List size: ${await hci.leReadResolvingListSize()}`);
    await hci.leClearResolvingList();

    const maxDataLength = await hci.leReadMaximumDataLength();
    console.log(`Max data length: ${JSON.stringify(maxDataLength)}`);

    const suggestedMaxDataLength = await hci.leReadSuggestedDefaultDataLength();
    console.log(`Suggested max data length: ${JSON.stringify(suggestedMaxDataLength)}`);

    const advSets = await hci.leReadNumberOfSupportedAdvertisingSets();
    console.log(`Number of supported advertising sets: ${advSets}`);

    await hci.leWriteSuggestedDefaultDataLength({
      suggestedMaxTxOctets: 27,
      suggestedMaxTxTime:   328,
    });

    // await hci.leSetAdvertisingSetRandomAddress(0, Address.from(0x1429c386d3a9));
    await hci.leSetRandomAddress(Address.from(0x153c7f2c4b82));

    const gap = new Gap(hci);

    await gap.setScanParameters({
      ownAddressType:       LeOwnAddressType.RandomDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.FromWhiteList,
      scanningPhy: {
        Phy1M: {
          type:       LeScanType.Active,
          intervalMs: 100,
          windowMs:   100,
        }
      },
    });
    await gap.startScanning({
      filterDuplicates: LeScanFilterDuplicates.Enabled,
    });

    gap.on('adv-report', (report: LeExtAdvReport, data: AdvData) => {
      console.log(report, data);
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
