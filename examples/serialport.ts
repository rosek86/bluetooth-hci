import { Adapter, AdapterParams, HciAdapterFactory } from './HciAdapterFactory';
import Debug from 'debug';

import { Address } from '../src/utils/Address';
import { AdvData } from '../src/gap/AdvData';

import {
  LePhy,
  LeSetTxRxPhyOpts,
  LeAdvertisingEventProperties,
  LeAdvertisingChannelMap,
  LeOwnAddressType,
  LePeerAddressType,
  LeAdvertisingFilterPolicy,
  LePrimaryAdvertisingPhy,
  LeSecondaryAdvertisingPhy,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates,
  LeInitiatorFilterPolicy,
  LeWhiteListAddressType,
  LeWhiteList,
} from '../src/hci/HciLeController';
import { ReadTransmitPowerLevelType } from '../src/hci/HciControlAndBaseband';
import { LeExtAdvReportAddrType } from '../src/hci/HciEvent';
import { L2CAP } from '../src/l2cap/L2CAP';
import { Att } from '../src/att/Att';

const debug = Debug('nble-main');

(async () => {
  try {
    const adapter = await createHciAdapter();
    const hci = adapter.Hci;

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
      address:      Address.from(0x1429c386d3a9),
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

    // NOTE: command not implemented on the controller:
    // hci.on('LeReadLocalP256PublicKeyComplete', (status, event) => {
    //   console.log('LeReadLocalP256PublicKeyComplete', status, event);
    // });
    // await hci.leReadLocalP256PublicKey();
    // hci.on('LeGenerateDhKeyComplete', (status, event) => {
    //   console.log('LeGenerateDhKeyComplete', status, event);
    // });
    // await hci.leGenerateDhKeyV1({ publicKey: Buffer.alloc(64) });
    // return;

    await hci.leSetDefaultPhy({
      txPhys: LePhy.Phy1M,
      rxPhys: LePhy.Phy1M,
    });

    const selectedTxPower = await hci.leSetExtendedAdvertisingParameters(0, {
      advertisingEventProperties: [
        LeAdvertisingEventProperties.UseLegacyPDUs
      ],
      primaryAdvertisingIntervalMinMs: 1280,
      primaryAdvertisingIntervalMaxMs: 1280,
      primaryAdvertisingChannelMap: [
        LeAdvertisingChannelMap.Channel37,
        LeAdvertisingChannelMap.Channel38,
        LeAdvertisingChannelMap.Channel39,
      ],
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      peerAddressType: LePeerAddressType.PublicDeviceAddress,
      peerAddress: Address.from(0x000000000000),
      advertisingFilterPolicy: LeAdvertisingFilterPolicy.Any,
      primaryAdvertisingPhy: LePrimaryAdvertisingPhy.Phy1M,
      secondaryAdvertisingMaxSkip: 0,
      secondaryAdvertisingPhy: LeSecondaryAdvertisingPhy.Phy1M,
      advertisingSid: 0,
      scanRequestNotificationEnable: false,
      advertisingTxPower: 0,
    });
    console.log(`TX Power: ${selectedTxPower}`);

    await hci.leSetAdvertisingSetRandomAddress(0, Address.from(0x1429c386d3a9));

    await hci.leSetRandomAddress(Address.from(0x153c7f2c4b82));

    // await hci.leSetScanParameters({
    //   intervalMs: 100,
    //   windowMs: 100,
    //   ownAddressType: LeOwnAddressType.RandomDeviceAddress,
    //   scanningFilterPolicy: LeScanningFilterPolicy.All,
    //   type: LeScanType.Active,
    // });
    // await hci.leSetScanEnable(true, false);

    const l2cap = new L2CAP(hci);
    await l2cap.init();


    await hci.leSetExtendedScanParameters({
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.FromWhiteList,
      // scanningFilterPolicy: LeScanningFilterPolicy.All,
      scanningPhy: {
        Phy1M: {
          type: LeScanType.Active,
          intervalMs: 11.25,
          windowMs: 11.25
        }
      }
    });
    await hci.leSetExtendedScanEnable({
      enable: true,
      filterDuplicates: LeScanFilterDuplicates.Disabled,
      durationMs: 0
    });

    hci.on('LeDirectedAdvertisingReport', (report) => {
      console.log('LeDirectedAdvertisingReport', report);
    });
    hci.on('LeScanTimeout', () => {
      console.log('LeScanTimeout');
    });

    let connecting = false;
    hci.on('LeExtendedAdvertisingReport', async (report) => {
      try {
        if (connecting === true || report.data === null) {
          return;
        }

        const advData = AdvData.parse(report.data);
        console.log(report);
        console.log(JSON.stringify(advData, null, 2));

        if (report.address.toString() === 'F5:EF:D9:6E:47:C7') {
          connecting = true;
          await hci.leSetExtendedScanEnable({ enable: false });

          let peerAddressType = LePeerAddressType.PublicDeviceAddress;

          if (report.addressType === LeExtAdvReportAddrType.RandomDeviceAddress ||
              report.addressType === LeExtAdvReportAddrType.RandomIdentityAddress) {
            peerAddressType = LePeerAddressType.RandomDeviceAddress;
          }

          await hci.leExtendedCreateConnection({
            initiatorFilterPolicy: LeInitiatorFilterPolicy.PeerAddress,
            ownAddressType: LeOwnAddressType.RandomDeviceAddress,
            peerAddressType,
            peerAddress: report.address,
            initiatingPhy: {
              Phy1M: {
                scanIntervalMs: 100,
                scanWindowMs: 100,
                connectionIntervalMinMs: 7.5,
                connectionIntervalMaxMs: 100,
                connectionLatency: 0,
                supervisionTimeoutMs: 4000,
                minCeLengthMs: 2.5,
                maxCeLengthMs: 3.75,
              },
            }
          });
          console.log('connecting...');
        }
      } catch (err) {
        console.log(err);
      }
    });
    hci.on('LeEnhancedConnectionComplete', async (status, event) => {
      console.log('LeEnhancedConnectionComplete', status, event);
    });
    hci.on('LeChannelSelectionAlgorithm', async (event) => {
      console.log('LeChannelSelectionAlgorithm', event);

      await hci.writeAuthenticatedPayloadTimeout(event.connectionHandle, 200);

      const timeout = await hci.readAuthenticatedPayloadTimeout(event.connectionHandle);
      console.log(`AuthenticatedPayloadTimeout: ${timeout}`);

      await hci.readRemoteVersionInformation(event.connectionHandle);
    });
    hci.on('ReadRemoteVersionInformationComplete', async (err, event) => {
      console.log('ReadRemoteVersionInformationComplete', event);
      await hci.leReadRemoteFeatures(event.connectionHandle);
    });
    hci.on('LeReadRemoteFeaturesComplete', async (status, event) => {
      try {
        console.log('LeReadRemoteFeaturesComplete', status, event);

        // Unsupported Remote Feature / Unsupported LMP Feature
        // await hci.leSetDataLength(event.connectionHandle, {
        //   txOctets: 27,
        //   txTime:   328,
        // });

        const phy = await hci.leReadPhy(event.connectionHandle);
        console.log('phy:', phy);

        await hci.leConnectionUpdate({
          connectionHandle: event.connectionHandle,
          connectionIntervalMinMs: 40,
          connectionIntervalMaxMs: 90,
          connectionLatency: 0,
          supervisionTimeoutMs: 5000,
          minCeLengthMs: 2.5,
          maxCeLengthMs: 3.75,
        });
      } catch (err) {
        console.log(err);
      }
    });
    hci.on('LeConnectionUpdateComplete', async (status, event) => {
      try {
        console.log('LeConnectionUpdateComplete', event);

        const maxPowerLevel = await hci.readTransmitPowerLevel(
          event.connectionHandle,
          ReadTransmitPowerLevelType.Maximum
        );
        const curPowerLevel = await hci.readTransmitPowerLevel(
          event.connectionHandle,
          ReadTransmitPowerLevelType.Maximum
        );
        console.log(`Power Level: ${curPowerLevel}/${maxPowerLevel} dBm`);

        const att = new Att(l2cap, event.connectionHandle);

        const mtu = await att.exchangeMtuReq({ mtu: 40 });
        console.log(mtu);

        const info = await att.findInformationReq({
          startingHandle: 0x0001, endingHandle: 0xFFFF,
        });
        console.log(info);


        // await hci.leSetPhy(event.connectionHandle, {
        //   txPhys: LePhy.PhyCoded,
        //   rxPhys: LePhy.PhyCoded,
        //   opts:   LeSetTxRxPhyOpts.noPreferredCoding,
        // })

        // command disallowed, why?
        // const rssi = await hci.readRssi(event.connectionHandle);
        // console.log(`RSSI: ${rssi} dBm`);

        setTimeout(async () => {
          await hci.disconnect(event.connectionHandle);
        }, 2000);
      } catch (err) {
        console.log(err);
      }
    });
    hci.on('LePhyUpdateComplete', (status, event) => {
      console.log(status, event);
    });
    hci.on('DisconnectionComplete', (status, event) => {
      console.log('DisconnectionComplete', event);
    });
    hci.on('LeLongTermKeyRequest', (event) => {
      console.log('LeLongTermKeyRequest', event);
    });
    hci.on('LeRemoteConnectionParameterRequest', (event) => {
      console.log('LeRemoteConnectionParameterRequest', event);
    });
    hci.on('LeDataLengthChange', (event) => {
      console.log('LeDataLengthChange', event);
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
      pid: 0x000e,
    }
  };

  return HciAdapterFactory.create(adapterOptions);
}
