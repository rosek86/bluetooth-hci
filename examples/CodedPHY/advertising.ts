import {
  HciAdapter,
  createHciSerial,
  Address,
  AdvData,
  LeAdvertisingEventProperties,
  LeAdvertisingChannelMap,
  LeOwnAddressType,
  LePeerAddressType,
  LeAdvertisingFilterPolicy,
  LePrimaryAdvertisingPhy,
  LeSecondaryAdvertisingPhy,
  LeAdvertisingDataOperation,
  AddressType,
} from "../../src";
import { ArgsParser } from "../utils/ArgsParser";

(async () => {
  try {
    const args = await ArgsParser.getOptions();
    if (!args || args.type !== "serial") {
      throw new Error("Invalid input parameters");
    }

    const adapter = new HciAdapter(await createHciSerial(args.deviceId, args.serial));
    await adapter.open();
    await adapter.defaultAdapterSetup();

    const hci = adapter.Hci;
    const selectedTxPower = await hci.leSetExtendedAdvertisingParametersV1(0, {
      advertisingEventProperties: [LeAdvertisingEventProperties.Connectable],
      primaryAdvertisingIntervalMinMs: 500,
      primaryAdvertisingIntervalMaxMs: 1000,
      primaryAdvertisingChannelMap: [
        LeAdvertisingChannelMap.Channel37,
        LeAdvertisingChannelMap.Channel38,
        LeAdvertisingChannelMap.Channel39,
      ],
      ownAddressType: LeOwnAddressType.RandomDeviceAddress,
      peerAddressType: LePeerAddressType.PublicDeviceAddress,
      peerAddress: Address.from(0x000000000000, AddressType.PublicDeviceAddress),
      advertisingFilterPolicy: LeAdvertisingFilterPolicy.Any,
      primaryAdvertisingPhy: LePrimaryAdvertisingPhy.PhyCoded,
      secondaryAdvertisingMaxSkip: 0,
      secondaryAdvertisingPhy: LeSecondaryAdvertisingPhy.PhyCoded,
      advertisingSid: 0,
      scanRequestNotificationEnable: false,
      advertisingTxPower: 8,
    });
    console.log(`TX Power: ${selectedTxPower}`);

    await hci.leSetAdvertisingSetRandomAddress(0, Address.from(0x1429c386d3a9, AddressType.RandomDeviceAddress));

    const advertisingData = AdvData.build({
      flags: 6,
      completeLocalName: "Zephyr Ctrl",
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

    // NOTE: Scan response not supported on CodedPHY

    await hci.leSetExtendedAdvertisingEnable({
      enable: true,
      sets: [{ advertHandle: 0 }],
    });

    console.log("end");
  } catch (e) {
    const err = e as Error;
    console.log(err.message);
  } finally {
    // port.close();
  }
})();
