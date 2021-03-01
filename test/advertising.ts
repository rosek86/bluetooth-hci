import SerialPort from 'serialport';

import { H4 } from '../src/H4';
import { Hci } from '../src/Hci';
import { Address } from '../src/Address';
import { AdvData } from '../src/AdvData';

import {
  LePhy,
  LeAdvertisingEventProperties,
  LeAdvertisingChannelMap,
  LeOwnAddressType,
  LePeerAddressType,
  LeAdvertisingFilterPolicy,
  LePrimaryAdvertisingPhy,
  LeSecondaryAdvertisingPhy,
  LeAdvertisingDataOperation,
  LeScanResponseDataOperation,
} from '../src/HciLeController';
import { ReadTransmitPowerLevelType } from '../src/HciControlAndBaseband';

(async () => {
  try {
    const portInfo = await findHciPort();
    const port = await openHciPort(portInfo);

    const hci = new Hci({
      send: (packetType, data) => {
        port.write([packetType, ...data]);
      },
    });

    const h4 = new H4();

    port.on('data', (data) => {
      let result = h4.parse(data);
      do {
        if (result) {
          hci.onData(result.type, result.packet);
          result = h4.parse(Buffer.allocUnsafe(0));
        }
      } while (result);
    });
    port.on('error', (err) => {
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

    const maxDataLength = await hci.leReadMaximumDataLength();
    console.log(`Max data length: ${JSON.stringify(maxDataLength)}`);

    const suggestedMaxDataLength = await hci.leReadSuggestedDefaultDataLength();
    console.log(`Suggested max data length: ${JSON.stringify(suggestedMaxDataLength)}`);

    const advSets = await hci.leReadNumberOfSupportedAdvertisingSets();
    console.log(`Number of supported advertising sets: ${advSets}`);

    console.log(`Whitelist size: ${await hci.leReadWhiteListSize()}`);
    await hci.leClearWhiteList();

    console.log(`Resolving List size: ${await hci.leReadResolvingListSize()}`);
    await hci.leClearResolvingList();

    await hci.leWriteSuggestedDefaultDataLength({
      suggestedMaxTxOctets: 27,
      suggestedMaxTxTime:   328,
    });

    await hci.leSetDefaultPhy({
      txPhys: LePhy.Phy1M,
      rxPhys: LePhy.Phy1M,
    });

    await hci.leSetAdvertisingSetRandomAddress(0, Address.from(0x1429c386d3a9));

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

    const advertisingData = AdvData.build({
      flags: 6,
      completeLocalName: 'Tacx Flux 39756',
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

    const scanResponseData = AdvData.build({
      completeListOf16bitSeviceClassUuids: [ '1826', '1818' ],
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
    hci.on('LeChannelSelectionAlgorithm', async (event) => {
      console.log('LeChannelSelectionAlgorithm', event);

      await hci.writeAuthenticatedPayloadTimeout(event.connectionHandle, 200);

      const timeout = await hci.readAuthenticatedPayloadTimeout(event.connectionHandle);
      console.log(`AuthenticatedPayloadTimeout: ${timeout}`);

      await hci.readRemoteVersionInformation(event.connectionHandle);
    });
    hci.on('LeAdvertisingSetTerminated', async (err, event) => {
      console.log(event);
    })
    hci.on('ReadRemoteVersionInformationComplete', async (err, event) => {
      try {
        console.log('ReadRemoteVersionInformationComplete', event);

        const phy = await hci.leReadPhy(event.connectionHandle);
        console.log('phy:', phy);

        const maxPowerLevel = await hci.readTransmitPowerLevel(
          event.connectionHandle,
          ReadTransmitPowerLevelType.Maximum
        );
        const curPowerLevel = await hci.readTransmitPowerLevel(
          event.connectionHandle,
          ReadTransmitPowerLevelType.Maximum
        );
        console.log(`Power Level: ${curPowerLevel}/${maxPowerLevel} dBm`);

        // await hci.leSetPhy(event.connectionHandle, {
        //   txPhys: LePhy.PhyCoded,
        //   rxPhys: LePhy.PhyCoded,
        //   opts:   LeSetTxRxPhyOpts.noPreferredCoding,
        // })

        // command disallowed, why?
        // const rssi = await hci.readRssi(event.connectionHandle);
        // console.log(`RSSI: ${rssi} dBm`);
      } catch (err) {
        console.log(err);
      }
    });
    hci.on('LePhyUpdateComplete', (status, event) => {
      console.log(status, event);
    });
    hci.on('DisconnectionComplete', async (status, event) => {
      console.log('DisconnectionComplete', event);

      await hci.leSetExtendedAdvertisingEnable({
        enable: true,
        sets: [{ advertHandle: 0 }]
      });
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

  } catch (err) {
    console.log(err.message);
  } finally {
    // port.close();
  }
})();

async function findHciPort() {
  const portInfos = await SerialPort.list();

  const hciPortInfos = portInfos.filter(
    (port) => port.manufacturer === 'SEGGER'
  );

  if (hciPortInfos.length === 0) {
    throw new Error(`Cannot find appropriate port`);
  }

  return hciPortInfos[0];
}

async function openHciPort(portInfo: SerialPort.PortInfo): Promise<SerialPort> {
  const port = new SerialPort(portInfo.path, {
    autoOpen: false,
    baudRate: 1000000,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    rtscts: true,
  });

  const waitOpen = new Promise<SerialPort>((resolve,  reject) => {
    port.on('open', () => resolve(port));
    port.open((err) => reject(err));
  });

  return await waitOpen;
}
