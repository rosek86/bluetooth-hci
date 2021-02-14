import Hci from './Hci';
import { HciPacketType } from './HciPacketType';
import {
  LeAdvertisingChannelMap, LeAdvertisingEventProperties,
  LeAdvertisingFilterPolicy, LeOwnAddressType, LePeerAddressType, LePhy,
  LePrimaryAdvertisingPhy, LeSecondaryAdvertisingPhy, LeScanningFilterPolicy,
  LeScanType,
  LeScanFilterDuplicates } from './HciLe';

let hci: Hci | null = null;
let txBuffer: Buffer | null = null;

function prepareResult(res: string): void {
  setImmediate(() => hci!.onData(HciPacketType.HciEvent, Buffer.from(res, 'hex')));
}

function checkRequest(req: string): boolean {
  return Buffer.compare(txBuffer!, Buffer.from(req, 'hex')) === 0;
}

(async () => {
  try {
    hci = new Hci({
      send: (packetType, data) => {
        console.log(packetType, data.toString('hex'));
        txBuffer = data;
      },
    });

    prepareResult('0e0401030c00');
    await hci.reset();

    prepareResult('0e0c010310000000000060000000');
    console.log(await hci.readLocalSupportedFeatures());

    prepareResult('0e0c010110000b7b110b59007b11');
    console.log(await hci.readLocalVersionInformation());

    prepareResult('0e0a01091000AABBCCDDEEFF');
    console.log((await hci.readBdAddr()).toString(16));

    prepareResult('0e07010220001b0003');
    console.log(await hci.leReadBufferSize());

    prepareResult('0e0c01032000f559000000007b11');
    console.log(await hci.leReadSupportedFeatures());

    prepareResult('0e0c011c2000ff590000ff007b11');
    console.log((await hci.leReadSupportedStates()).toString());

    prepareResult(
      '0e44010210002000800000c000000000' +
      'e40000002822000000000000040000f7' +
      'ffff7f00000030c079feffe380040000' +
      '00000000000000000000000000000000' +
      '000000000000'
    );
    console.log(await hci.readLocalSupportedCommands());

    prepareResult('0e0401010c00');
    await hci.setEventMask();

    prepareResult('0e0401012000');
    await hci.leSetEventMask();

    prepareResult('0e05010f200008');
    console.log(`Whitelist size: ${await hci.leReadWhiteListSize()}`);

    prepareResult('0e0401102000');
    await hci.leClearWhiteList();

    prepareResult('0e05012a200008');
    console.log(`Resolving List size: ${await hci.leReadResolvingListSize()}`);

    prepareResult('0e0401292000');
    await hci.leClearResolvingList();

    prepareResult('0e0c012f2000fb00900afb00900a');
    const maxDataLength = await hci.leReadMaximumDataLength();
    console.log(`Max data length: ${JSON.stringify(maxDataLength)}`);

    prepareResult('0e08012320001b004801');
    const suggestedMaxDataLength = await hci.leReadSuggestedDefaultDataLength();
    console.log(`Suggested max data length: ${JSON.stringify(suggestedMaxDataLength)}`);

    prepareResult('0e05013b200001');
    const advSets = await hci.leReadNumberOfSupportedAdvertisingSets();
    console.log(`number of supported advertising sets: ${advSets}`);

    prepareResult('0e0401630c00');
    await hci.setEventMaskPage2();

    prepareResult('0e0401242000');
    await hci.leWriteSuggestedDefaultDataLength({
      suggestedMaxTxOctets: 5,
      suggestedMaxTxTime: 111,
    });

    prepareResult('0e0401312000');
    await hci.leSetDefaultPhy({
      txPhys: LePhy.PhyCoded,
      rxPhys: LePhy.PhyCoded,
    });

    prepareResult('0e050136200000');
    const selectedTxPower = await hci.leSetExtendedAdvertisingParameters({
      advertisingHandle: 0,
      advertisingEventProperties: [LeAdvertisingEventProperties.UseLegacyPDUs],
      primaryAdvertisingIntervalMinMs: 1280,
      primaryAdvertisingIntervalMaxMs: 1280,
      primaryAdvertisingChannelMap: [
        LeAdvertisingChannelMap.Channel37,
        LeAdvertisingChannelMap.Channel38,
        LeAdvertisingChannelMap.Channel39,
      ],
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      peerAddressType: LePeerAddressType.PublicDeviceAddress,
      peerAddress: 0x000000000000,
      advertisingFilterPolicy: LeAdvertisingFilterPolicy.Any,
      primaryAdvertisingPhy: LePrimaryAdvertisingPhy.Phy1M,
      secondaryAdvertisingMaxSkip: 0,
      secondaryAdvertisingPhy: LeSecondaryAdvertisingPhy.Phy1M,
      advertisingSid: 0,
      scanRequestNotificationEnable: false
    });
    console.log(`Compare: ${checkRequest('362019001000000800000800070100000000000000007f0100010000')}`);
    console.log(`Selected Tx: ${selectedTxPower}`);

    prepareResult('0e0401352000');
    await hci.leSetAdvertisingSetRandomAddress({
      advertisingHandle: 0,
      advertisingRandomAddress: 0x1429c386d3a9,
    });
    console.log(`Compare: ${checkRequest('35200700a9d386c32914')}`);

    prepareResult('0e0401052000');
    await hci.leSetRandomAddress(0x153c7f2c4b82);
    console.log(`Compare: ${checkRequest('052006824b2c7f3c15')}`);

    prepareResult('0e0401412000');
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
    console.log(`Compare: ${checkRequest('4120080100010112001200')}`);

    prepareResult('0e0401422000');
    await hci.leSetExtendedScanEnable({
      enable: true,
      filterDuplicates: LeScanFilterDuplicates.Enabled,
    });
    console.log(`Compare: ${checkRequest('422006010100000000')}`);

    console.log('done');
  } catch (err) {
    console.log(err);
  }
})();
