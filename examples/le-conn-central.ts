import Debug from 'debug';

import { Utils } from './utils/Utils';
import { Address, AddressType } from '../src/utils/Address';
import { AdvData } from '../src/gap/AdvData';

import {
  LePhy,
  LeOwnAddressType,
  LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates,
  LeInitiatorFilterPolicy
} from '../src/hci/HciLeController';
import { ReadTransmitPowerLevelType } from '../src/hci/HciControlAndBaseband';
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
    await hci.leSetRandomAddress(Address.from('aa:ab:ac:de:df:ff', AddressType.Random));

    const l2cap = new L2CAP(hci);
    await l2cap.init();

    console.log('set default phy');
    await hci.leSetDefaultPhy({ txPhys: LePhy.Phy1M, rxPhys: LePhy.Phy1M });

    console.log('set ext scan params');
    await hci.leSetExtendedScanParameters({
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      scanningFilterPolicy: LeScanningFilterPolicy.All,
      scanningPhy: {
        Phy1M: {
          type: LeScanType.Active,
          intervalMs: 11.25,
          windowMs: 11.25
        }
      }
    });

    console.log('set ext scan enable');
    await hci.leSetExtendedScanEnable({
      enable: true,
      filterDuplicates: LeScanFilterDuplicates.Disabled,
      durationMs: 0,
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
        if (report.address.toString() !== 'AA:BB:CC:DD:EE:FF') {
          return;
        }

        const advData = AdvData.parse(report.data);
        console.log(report);
        console.log(JSON.stringify(advData, null, 2));

        connecting = true;
        await hci.leSetExtendedScanEnable({ enable: false });

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

    hci.on('LeEnhancedConnectionComplete', async (err, event) => {
      console.log('LeEnhancedConnectionComplete', err, event);
    });

    hci.on('LeChannelSelectionAlgorithm', async (err, event) => {
      connecting = false;
      console.log('LeChannelSelectionAlgorithm', err, event);

      await hci.readRemoteVersionInformation(event.connectionHandle);

      await hci.leReadRemoteFeatures(event.connectionHandle);

      await hci.leSetDataLength(event.connectionHandle, {
        txOctets: 200,
        txTime:   2000,
      });

      const phy = await hci.leReadPhy(event.connectionHandle);
      console.log('PHY:', phy);

      await hci.leConnectionUpdate({
        connectionHandle: event.connectionHandle,
        connectionIntervalMinMs: 40,
        connectionIntervalMaxMs: 90,
        connectionLatency: 0,
        supervisionTimeoutMs: 5000,
        minCeLengthMs: 2.5,
        maxCeLengthMs: 3.75,
      });

      const maxPowerLevel = await hci.readTransmitPowerLevel(
        event.connectionHandle,
        ReadTransmitPowerLevelType.Maximum
      );
      const curPowerLevel = await hci.readTransmitPowerLevel(
        event.connectionHandle,
        ReadTransmitPowerLevelType.Current
      );
      console.log(`Power Level: ${curPowerLevel}/${maxPowerLevel} dBm`);

      const att = new Att(l2cap, event.connectionHandle);

      const mtu = await att.exchangeMtuReq({ mtu: 200 });
      console.log('MTU', mtu);

      const info = await att.findInformationReq({
        startingHandle: 0x0001, endingHandle: 0xFFFF,
      });
      console.log(info);

      const rssi = await hci.readRssi(event.connectionHandle);
      console.log(`RSSI: ${rssi} dBm`);

      setTimeout(async () => {
        att.destroy();
        await hci.disconnect(event.connectionHandle);
      }, 2000);
    });

    hci.on('LePhyUpdateComplete', (err, event) => {
      console.log('LePhyUpdateComplete', err, event);
    });
    hci.on('LeRemoteConnectionParameterRequest', (err, event) => {
      console.log('LeRemoteConnectionParameterRequest', err, event);
    });

    hci.on('LeConnectionUpdateComplete', async (err, event) => {
      console.log('LeConnectionUpdateComplete', err, event);
    });
    hci.on('LeReadRemoteFeaturesComplete', (status, event) => {
      console.log('LeReadRemoteFeaturesComplete', status, event);
    });
    hci.on('ReadRemoteVersionInformationComplete', (err, event) => {
      console.log('ReadRemoteVersionInformationComplete', err, event);
    });
    hci.on('LeDataLengthChange', (err, event) => {
      console.log('LeDataLengthChange', err, event);
    });
    hci.on('DisconnectionComplete', (err, event) => {
      console.log('DisconnectionComplete', err, event);
    });
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  } finally {
    // port.close();
  }
})();
