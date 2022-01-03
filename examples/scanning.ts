import { Utils } from './utils/Utils';
import { Address } from '../src/utils/Address';
import { AdvData } from '../src/gap/AdvData';

import { Gap } from '../src/gap/Gap';

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
    const adapter = await Utils.createHciAdapter({
      usb: { vid: 0x2fe3, pid: 0x000e },
    });
    const hci = adapter.Hci;

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

    const device: LeWhiteList = {
      addressType:  LeWhiteListAddressType.Random,
      address:      Address.from(0x1429c386d3a9),
    }
    await hci.leAddDeviceToWhiteList(device);

    console.log(`Resolving List size: ${await hci.leReadResolvingListSize()}`);
    await hci.leClearResolvingList();

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
        },
      },
    });
    await gap.startScanning({ filterDuplicates: LeScanFilterDuplicates.Enabled });

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
