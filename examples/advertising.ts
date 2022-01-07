import { Utils } from './utils/Utils';
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

(async () => {
  try {
    const adapter = await Utils.createHciAdapter({
      usb: { vid: 0x2fe3, pid: 0x000d },
    });
    const hci = adapter.Hci;

    await Utils.defaultAdapterSetup(hci);

    await hci.leSetRandomAddress(Address.from(0x153c7f2c4b82));

    const selectedTxPower = await hci.leSetExtendedAdvertisingParameters(0, {
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

    await hci.leSetAdvertisingSetRandomAddress(0, Address.from(0x1429c386d3a9));

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

    console.log('end');
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  }
})();
