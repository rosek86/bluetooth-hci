import { HciAdapterUtils } from '../src/utils/HciAdapterUtils';
import { Address } from '../src/utils/Address';
import { AdvData } from '../src/gap/AdvData';

import {
  LeAdvertisingEventProperties,
  LeAdvertisingChannelMap,
  LeOwnAddressType,
  LePeerAddressType,
  LeAdvertisingFilterPolicy,
  LePrimaryAdvertisingPhy,
  LeSecondaryAdvertisingPhy,
  LeAdvertisingDataOperation,
  LeScanResponseDataOperation
} from '../src/hci/HciLeController';
import { L2CAP } from '../src/l2cap/L2CAP';
import { Att } from '../src/att/Att';

(async () => {
  try {
    const adapter = await HciAdapterUtils.createHciAdapter();
    await adapter.defaultAdapterSetup();

    const hci = adapter.Hci;

    const l2cap = new L2CAP(hci);
    await l2cap.init();

    const selectedTxPower = await hci.leSetExtendedAdvertisingParametersV1(0, {
      advertisingEventProperties: [
        LeAdvertisingEventProperties.UseLegacyPDUs,
        LeAdvertisingEventProperties.Connectable,
        LeAdvertisingEventProperties.Scannable,
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
      primaryAdvertisingPhy: LePrimaryAdvertisingPhy.Phy1M,
      secondaryAdvertisingMaxSkip: 0,
      secondaryAdvertisingPhy: LeSecondaryAdvertisingPhy.Phy1M,
      advertisingSid: 0,
      scanRequestNotificationEnable: false,
      advertisingTxPower: 8,
    });
    console.log(`TX Power: ${selectedTxPower}`);

    await hci.leSetAdvertisingSetRandomAddress(0, Address.from('AA:BB:CC:DD:EE:FF'));

    const advertisingData = AdvData.build({
      flags: 6,
      completeLocalName: 'Zephyr Ctrl',
      manufacturerData: {
        ident: 0x0689,
        data: Buffer.from([41, 0]),
      },
    });
    await hci.leSetExtendedAdvertisingData(0, {
      operation: LeAdvertisingDataOperation.Complete,
      fragment: false,
      data: advertisingData,
    });

    const scanResponseData = AdvData.build({
      completeListOf16bitServiceClassUuids: [ '1826', '1818' ],
      completeListOf128bitServiceClassUuids: [
        '669aa6050c08969ee21186ad5062675f'
      ],
      serviceData16bitUuid: [{
        uuid: '1826',
        data: Buffer.from([ 1, 0, 32 ]),
      }],
    });
    await hci.leSetExtendedScanResponseData(0, {
      operation: LeScanResponseDataOperation.Complete,
      fragment: false,
      data: scanResponseData,
    });

    await hci.leSetExtendedAdvertisingEnable({
      enable: true,
      sets: [{ advertHandle: 0 }],
    });

    hci.on('LeEnhancedConnectionComplete', async (status, event) => {
      console.log('LeEnhancedConnectionComplete', status, event);
    });
    hci.on('LeChannelSelectionAlgorithm', (status, event) => {
      console.log('LeChannelSelectionAlgorithm', status, event);

      const att = new Att(l2cap, event.connectionHandle);

      att.on('ExchangeMtuReq', (evt) => {
        console.log(evt);
        att.exchangeMtuRsp({
          mtu: evt.mtu,
        });
      });

      att.on('FindInformationReq', (evt) => {
        console.log(evt);
        att.findInformationRsp([
          { handle: 4, uuid: Buffer.from([11,2]) },
        ]);
      });

      const onDisconnectionComplete = () => {
        hci.off('DisconnectionComplete', onDisconnectionComplete);
      };
      hci.on('DisconnectionComplete', onDisconnectionComplete);
    });
    hci.on('LeAdvertisingSetTerminated', (status, event) => {
      console.log('LeAdvertisingSetTerminated', status, event);
    });
    hci.on('LeConnectionUpdateComplete', async (status, event) => {
      console.log('LeConnectionUpdateComplete', status, event);
    });

    hci.on('DisconnectionComplete', async (err, event) => {
      console.log('DisconnectionComplete', err, event);
      await hci.leSetExtendedAdvertisingEnable({
        enable: true,
        sets: [{ advertHandle: 0 }],
      });
    });

    console.log('end');
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
