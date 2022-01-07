import Debug from 'debug';

import { Utils } from './utils/Utils';
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
  LeWhiteListAddressType
} from '../src/hci/HciLeController';
import { ReadTransmitPowerLevelType } from '../src/hci/HciControlAndBaseband';
import { LeExtAdvReportAddrType } from '../src/hci/HciEvent';
import { L2CAP } from '../src/l2cap/L2CAP';
import { Att } from '../src/att/Att';

const debug = Debug('nble-main');

(async () => {
  try {
    const adapter = await Utils.createHciAdapter({
      usb: { vid: 0x2fe3, pid: 0x000d },
    });
    const hci = adapter.Hci;

    await Utils.defaultAdapterSetup(hci);

    // await hci.leAddDeviceToWhiteList({
    //   addressType:  LeWhiteListAddressType.Random,
    //   address:      Address.from('F5:EF:D9:6E:47:C7'),
    // });

    await hci.leSetDefaultPhy({ txPhys: LePhy.Phy1M, rxPhys: LePhy.Phy1M });

    await hci.leSetRandomAddress(Address.from(0x153c7f2c4b82));

    const l2cap = new L2CAP(hci);
    await l2cap.init();

    await hci.leSetExtendedScanParameters({
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      // scanningFilterPolicy: LeScanningFilterPolicy.FromWhiteList,
      scanningFilterPolicy: LeScanningFilterPolicy.All,
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

        if (report.address.toString() !== 'F5:EF:D9:6E:47:C7') {
          return;
        }

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
          },
        });
        console.log('connecting...');
      } catch (err) {
        console.log(err);
      }
    });

    hci.on('LeEnhancedConnectionComplete', async (status, event) => {
      console.log('LeEnhancedConnectionComplete', status, event);
    });

    hci.on('LeChannelSelectionAlgorithm', async (status, event) => {
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
    hci.on('DisconnectionComplete', async (status, event) => {
      console.log('DisconnectionComplete', event);
      // await hci.leSetExtendedScanEnable({ enable: true });
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
