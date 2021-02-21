import { EventEmitter } from 'events';
import Debug from 'debug';

import { HciPacketType } from './HciPacketType';

import { HciErrorCode } from './HciError';
import { HciDisconnectReason } from './HciError';
import { HciParserError, makeHciError, makeParserError } from './HciError';

import { Address } from './Address';
import { HciCmd } from './HciCmd';
import { HciEvent, HciLeEvent } from './HciEvent';
import {
   HciOcfInformationParameters,
   HciOcfControlAndBasebandCommands,
   HciOcfLeControllerCommands,
   HciOcfStatusParameters,
   HciOcfLinkControlCommands
} from './HciOgfOcf'
import {
  CompletedPackets, EventMask, EventMask2, FlowControlEnable, HostBufferSize,
  HostNumberOfCompletedPackets, ReadAuthenticatedPayloadTimeout, ReadLeHostSupport,
  ReadTransmitPowerLevel, ReadTransmitPowerLevelType, SetControllerToHostFlowControl,
  SetEventMask, SetEventMask2, WriteAuthenticatedPayloadTimeout, WriteLeHostSupported
} from './HciControlAndBaseband';
import {
  LocalSupportedFeatures, LocalVersionInformation, ReadLocalSupportedFeatures,
  ReadLocalVersionInformation, ReadBufferSize, BufferSize, ReadBdAddr, LocalSupportedCommands,
  ReadLocalSupportedCommands, ReadRssi
} from './HciInformationParameters';
import {
  LeAdvertisingDataOperation,LePhy, LeSupportedStates, LeScanResponseDataOperation, LeScanFilterDuplicates,
  LeExtAdvReport, LeExtAdvEventTypeParser, LeEvents, LeSetEventsMask, LeBufferSize,
  LeReadBufferSize, LeReadBufferSizeV2, LeBufferSizeV2, LeReadLocalSupportedFeatures,
  LeLocalSupportedFeatures, LeSetRandomAddress, LeAdvertisingParameters, LeSetAdvertisingParameters,
  LeReadAdvertisingPhysicalChannelTxPower, LeSetAdvertisingScanResponseData, LeSetAdvertisingEnable,
  LeScanParameters, LeCreateConnection, LeSetScanParameters, LeSetScanEnabled, LeConnectionUpdate,
  LeReadWhiteListSize, LeWhiteList, LeExtendedAdvertisingParameters, LeExtendedScanParameters,
  LeReadChannelMap, LeEncrypt, LeRand, LeEnableEncryption, LeLongTermKeyRequestReply,
  LeLongTermKeyRequestNegativeReply, LeReceiverTestV1, LeReceiverTestV2, LeReceiverTestV3,
  LeTransmitterTestV1, LeTransmitterTestV2, LeTransmitterTestV3, LeTransmitterTestV4, LeTestEnd,
  LeRemoteConnectionParameterRequestReply, LeRemoteConnectionParameterRequestNegativeReply,
  LeDataLength, LeSuggestedDefaultDataLength, DhKeyV1, DhKeyV2
} from './HciLeController';

const debug = Debug('nble-hci');

interface HciInit {
  cmdTimeout?: number;
  send: (pt: HciPacketType, data: Buffer) => void;
}

enum AclDataBoundary {
  FirstNoFlushFrag,
  NextFrag,
  FirstFrag,
  Complete
}

enum AclDataBroadcast {
  PointToPoint,
  Broadcast,
}

export declare interface Hci {
  on(event: 'ext-adv-report', listener: (report: LeExtAdvReport) => void): this;
  on(event: string, listener: Function): this;
}

export class Hci extends EventEmitter {
  private send: (pt: HciPacketType, data: Buffer) => void;
  private cmd: HciCmd;

  public constructor(init: HciInit) {
    super();

    this.send = init.send;

    const timeout = init.cmdTimeout ?? 2000;
    this.cmd = new HciCmd(this.send, timeout);
  }

  // Link Control

  public async disconnect(connHandle: number, reason: HciDisconnectReason): Promise<void> {
    const payload = Buffer.allocUnsafe(3);
    payload.writeUInt16LE(connHandle, 0);
    payload.writeUInt8(reason);
    const ocf = HciOcfLinkControlCommands.Disconnect;
    await this.cmd.linkControl({ ocf, payload });
  }

  public async readRemoteVersionInformation(connHandle: number): Promise<void> {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUInt16LE(connHandle, 0);
    const ocf = HciOcfLinkControlCommands.ReadRemoteVersionInformation;
    await this.cmd.linkControl({ ocf, payload });
  }

  // Control and Baseband

  public async setEventMask(events: Partial<EventMask> = {}): Promise<void> {
    const ocf = HciOcfControlAndBasebandCommands.SetEventMask;
    const payload = SetEventMask.inParams(events);
    await this.cmd.controlAndBaseband({ ocf, payload });
  }

  public async reset(): Promise<void> {
    const ocf = HciOcfControlAndBasebandCommands.Reset;
    await this.cmd.controlAndBaseband({ ocf });
  }

  public async readTransmitPowerLevel(connHandle: number, type: ReadTransmitPowerLevelType): Promise<number> {
    const ocf = HciOcfControlAndBasebandCommands.ReadTransmitPowerLevel;;
    const payload = ReadTransmitPowerLevel.inParams(connHandle, type);
    const result = await this.cmd.controlAndBaseband({ ocf, connHandle, payload });
    return ReadTransmitPowerLevel.outParams(result.returnParameters);
  }

  public async setControllerToHostFlowControl(enable: FlowControlEnable): Promise<void> {
    const ocf = HciOcfControlAndBasebandCommands.SetControllerToHostFlowControl;
    const payload = SetControllerToHostFlowControl.inParams(enable);
    await this.cmd.controlAndBaseband({ ocf, payload });
  }

  public async setEventMaskPage2(events: Partial<EventMask2> = {}): Promise<void> {
    const ocf = HciOcfControlAndBasebandCommands.SetEventMaskPage2;
    const payload = SetEventMask2.inParams(events);
    await this.cmd.controlAndBaseband({ ocf, payload });
  }

  public async readLeHostSupport(): Promise<boolean> {
    const ocf = HciOcfControlAndBasebandCommands.ReadLeHostSupport;
    const result = await this.cmd.controlAndBaseband({ ocf });
    return ReadLeHostSupport.outParams(result.returnParameters);
  }

  public async writeLeHostSupported(leSupportedHost: boolean): Promise<void> {
    const ocf = HciOcfControlAndBasebandCommands.WriteLeHostSupport;
    const payload = WriteLeHostSupported.inParams(leSupportedHost);
    await this.cmd.controlAndBaseband({ ocf, payload });
  }

  public async hostBufferSize(params: HostBufferSize): Promise<void> {
    const ocf = HciOcfControlAndBasebandCommands.HostBufferSize;
    const payload = HostBufferSize.inParams(params);
    await this.cmd.controlAndBaseband({ ocf, payload });
  }

  public async hostNumberOfCompletedPackets(params: CompletedPackets[]): Promise<void> {
    const ocf = HciOcfControlAndBasebandCommands.HostNumberOfCompletedPackets;
    const payload = HostNumberOfCompletedPackets.inParams(params);
    await this.cmd.controlAndBasebandNoResponse({ ocf, payload });
  }

  public async readAuthenticatedPayloadTimeout(connHandle: number): Promise<number> {
    const ocf = HciOcfControlAndBasebandCommands.ReadAuthenticatedPayloadTimeout;
    const payload = ReadAuthenticatedPayloadTimeout.inParams(connHandle);
    const result = await this.cmd.controlAndBaseband({ ocf, connHandle, payload });
    return ReadAuthenticatedPayloadTimeout.outParams(result.returnParameters);
  }

  public async writeAuthenticatedPayloadTimeout(connHandle: number, timeoutMs: number): Promise<void> {
    const ocf = HciOcfControlAndBasebandCommands.WriteAuthenticatedPayloadTimeout;
    const payload = WriteAuthenticatedPayloadTimeout.inParams(connHandle, timeoutMs);
    await this.cmd.controlAndBaseband({ ocf, connHandle, payload });
  }

  // Information parameters

  public async readLocalSupportedFeatures(): Promise<LocalSupportedFeatures> {
    const ocf = HciOcfInformationParameters.ReadLocalSupportedFeatures;
    const result = await this.cmd.informationParameters({ ocf });
    return ReadLocalSupportedFeatures.outParams(result.returnParameters);
  }

  public async readLocalVersionInformation(): Promise<LocalVersionInformation> {
    const ocf = HciOcfInformationParameters.ReadLocalVersionInformation;
    const result = await this.cmd.informationParameters({ ocf });
    return ReadLocalVersionInformation.outParams(result.returnParameters);
  }

  public async readBufferSize(): Promise<BufferSize> {
    const ocf = HciOcfInformationParameters.ReadBufferSize;
    const result = await this.cmd.informationParameters({ ocf });
    return ReadBufferSize.outParams(result.returnParameters);
  }

  public async readBdAddr(): Promise<number> {
    const ocf = HciOcfInformationParameters.ReadBdAddr;
    const result = await this.cmd.informationParameters({ ocf });
    return ReadBdAddr.outParams(result.returnParameters);
  }

  public async readLocalSupportedCommands(): Promise<LocalSupportedCommands> {
    const ocf = HciOcfInformationParameters.ReadLocalSupportedCommands;
    const result = await this.cmd.informationParameters({ ocf });
    return ReadLocalSupportedCommands.outParams(result.returnParameters);
  }

  public async readRssi(connHandle: number): Promise<number> {
    const ocf = HciOcfStatusParameters.ReadRssi;
    const payload = ReadRssi.inParams(connHandle);
    const result = await this.cmd.statusParameters({ ocf, connHandle, payload });
    return ReadRssi.outParams(result.returnParameters);
  }

  // LE Controller

  public async leSetEventMask(events: Partial<LeEvents> = {}): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetEventMask;
    const payload = LeSetEventsMask.inParams(events);
    await this.cmd.leController({ ocf, payload });
  }

  public async leReadBufferSize(): Promise<LeBufferSize> {
    const ocf = HciOcfLeControllerCommands.ReadBufferSizeV1;
    const result = await this.cmd.leController({ ocf });
    return LeReadBufferSize.outParams(result.returnParameters);
  }

  public async leReadBufferSizeV2(): Promise<LeBufferSizeV2> {
    const ocf = HciOcfLeControllerCommands.ReadBufferSizeV2;
    const result = await this.cmd.leController({ ocf });
    return LeReadBufferSizeV2.outParams(result.returnParameters);
  }

  public async leReadLocalSupportedFeatures(): Promise<LeLocalSupportedFeatures> {
    const ocf = HciOcfLeControllerCommands.ReadLocalSupportedFeatures;
    const result = await this.cmd.leController({ ocf });
    return LeReadLocalSupportedFeatures.outParams(result.returnParameters);
  }

  public async leSetRandomAddress(randomAddress: Address): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetRandomAddress;
    const payload = LeSetRandomAddress.inParams(randomAddress);
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetAdvertisingParameters(params: LeAdvertisingParameters): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetAdvertisingParameters;
    const payload = LeSetAdvertisingParameters.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leReadAdvertisingPhysicalChannelTxPower(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadAdvertisingPhysicalChannelTxPower;
    const result = await this.cmd.leController({ ocf });
    return LeReadAdvertisingPhysicalChannelTxPower.outParams(result.returnParameters);
  }

  public async leSetAdvertisingData(data: Buffer): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetAdvertisingData;
    const payload = LeSetAdvertisingScanResponseData.inParams(data);
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetScanResponseData(data: Buffer): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetScanResponseData;
    const payload = LeSetAdvertisingScanResponseData.inParams(data);
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetAdvertisingEnable(enable: boolean): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetAdvertisingEnable;
    const payload = LeSetAdvertisingEnable.inParams(enable);
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetScanParameters(params: LeScanParameters): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetScanParameters;
    const payload = LeSetScanParameters.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetScanEnable(enable: boolean, filterDuplicates?: boolean): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetScanEnable;
    const payload = LeSetScanEnabled.inParams(enable, filterDuplicates);
    await this.cmd.leController({ ocf, payload });
  }

  public async leCreateConnection(params: LeCreateConnection): Promise<void> {
    const ocf = HciOcfLeControllerCommands.CreateConnection;
    const payload = LeCreateConnection.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leCreateConnectionCancel(): Promise<void> {
    const ocf = HciOcfLeControllerCommands.CreateConnectionCancel;
    await this.cmd.leController({ ocf });
  }

  public async leReadWhiteListSize(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadWhiteListSize;
    const result = await this.cmd.leController({ ocf });
    return LeReadWhiteListSize.outParams(result.returnParameters);
  }

  public async leClearWhiteList(): Promise<void> {
    const ocf = HciOcfLeControllerCommands.ClearWhiteList;
    await this.cmd.leController({ ocf });
  }

  public async leAddDeviceToWhiteList(params: LeWhiteList): Promise<void> {
    const ocf = HciOcfLeControllerCommands.AddDeviceToWhiteList;
    const payload = LeWhiteList.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leRemoveDeviceFromWhiteList(params: LeWhiteList): Promise<void> {
    const ocf = HciOcfLeControllerCommands.RemoveDeviceFromWhiteList;
    const payload = LeWhiteList.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leConnectionUpdate(params: LeConnectionUpdate): Promise<void> {
    const ocf = HciOcfLeControllerCommands.ConnectionUpdate;
    const payload = LeConnectionUpdate.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetHostChannelClassification(channelMap: number): Promise<void> {
    const payload = Buffer.allocUnsafe(5);
    payload.writeUIntLE(channelMap, 0, 5);
    const ocf = HciOcfLeControllerCommands.SetHostChannelClassification;
    await this.cmd.leController({ ocf, payload });
  }

  public async leReadChannelMap(connHandle: number): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadChannelMap;
    const payload = LeReadChannelMap.inParams(connHandle);
    const result = await this.cmd.leController({ ocf, connHandle, payload });
    return LeReadChannelMap.outParams(result.returnParameters);
  }

  public async leReadRemoteFeatures(connHandle: number): Promise<void> {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUIntLE(connHandle, 0, 2);
    const ocf = HciOcfLeControllerCommands.ReadRemoteFeatures;
    await this.cmd.leController({ ocf, connHandle, payload });
  }

  public async leEncrypt(key: Buffer, plainTextData: Buffer): Promise<Buffer> {
    const ocf = HciOcfLeControllerCommands.Encrypt;
    const payload = LeEncrypt.inParams(key, plainTextData);
    const result = await this.cmd.leController({ ocf, payload });
    return LeEncrypt.outParams(result.returnParameters);
  }

  public async leRand(): Promise<Buffer> {
    const ocf = HciOcfLeControllerCommands.Rand;
    const result = await this.cmd.leController({ ocf });
    return LeRand.outParams(result.returnParameters);
  }

  public async leEnableEncryption(connHandle: number, params: LeEnableEncryption): Promise<void> {
    const ocf = HciOcfLeControllerCommands.EnableEncryption;
    const payload = LeEnableEncryption.inParams(connHandle, params);
    await this.cmd.leController({ ocf, connHandle, payload });
  }

  public async leLongTermKeyRequestReply(connHandle: number, longTermKey: Buffer): Promise<void> {
    const ocf = HciOcfLeControllerCommands.LongTermKeyRequestReply;
    const payload = LeLongTermKeyRequestReply.inParams(connHandle, longTermKey);
    await this.cmd.leController({ ocf, connHandle, payload });
  }

  public async leLongTermKeyRequestNegativeReply(connHandle: number): Promise<void> {
    const ocf = HciOcfLeControllerCommands.LongTermKeyRequestNegativeReply;
    const payload = LeLongTermKeyRequestNegativeReply.inParams(connHandle);
    await this.cmd.leController({ ocf, connHandle, payload });
  }

  public async leReadSupportedStates(): Promise<LeSupportedStates> {
    const ocf = HciOcfLeControllerCommands.ReadSupportedStates;
    const result = await this.cmd.leController({ ocf });
    return LeSupportedStates.outParams(result.returnParameters);
  }

  public async leReceiverTestV1(rxChannelMhz: number): Promise<void> {
    const ocf = HciOcfLeControllerCommands.ReceiverTestV1;
    const payload = LeReceiverTestV1.inParams(rxChannelMhz);
    await this.cmd.leController({ ocf, payload });
  }

  public async leReceiverTestV2(params: LeReceiverTestV2): Promise<void> {
    const ocf = HciOcfLeControllerCommands.ReceiverTestV2;
    const payload = LeReceiverTestV2.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leReceiverTestV3(params: LeReceiverTestV3): Promise<void> {
    const ocf = HciOcfLeControllerCommands.ReceiverTestV3;
    const payload = LeReceiverTestV3.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leTransmitterTestV1(params: LeTransmitterTestV1): Promise<void> {
    const ocf = HciOcfLeControllerCommands.TransmitterTestV1;
    const payload = LeTransmitterTestV1.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leTransmitterTestV2(params: LeTransmitterTestV2): Promise<void> {
    const ocf = HciOcfLeControllerCommands.TransmitterTestV2;
    const payload = LeTransmitterTestV2.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leTransmitterTestV3(params: LeTransmitterTestV3): Promise<void> {
    const ocf = HciOcfLeControllerCommands.TransmitterTestV3;
    const payload = LeTransmitterTestV3.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leTransmitterTestV4(params: LeTransmitterTestV4): Promise<void> {
    const ocf = HciOcfLeControllerCommands.TransmitterTestV4;
    const payload = LeTransmitterTestV4.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leTestEnd(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.TestEnd;
    const result = await this.cmd.leController({ ocf });
    return LeTestEnd.outParams(result.returnParameters);
  }

  public async leRemoteConnectionParameterRequestReply(
    connHandle: number,
    params: LeRemoteConnectionParameterRequestReply
  ): Promise<void> {
    const ocf = HciOcfLeControllerCommands.RemoteConnectionParameterRequestReply;
    const payload = LeRemoteConnectionParameterRequestReply.inParams(connHandle, params);
    await this.cmd.leController({ ocf, connHandle, payload });
  }

  public async leRemoteConnectionParameterRequestNegativeReply(
    connHandle: number,
    reason: HciErrorCode
  ): Promise<void> {
    const ocf = HciOcfLeControllerCommands.RemoteConnectionParameterRequestNegativeReply;
    const payload = LeRemoteConnectionParameterRequestNegativeReply.inParams(connHandle, reason);
    await this.cmd.leController({ ocf, connHandle, payload });
  }

  public async leSetDataLength(connHandle: number, params: LeDataLength): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetDataLength;
    const payload = LeDataLength.inParams(connHandle, params);
    await this.cmd.leController({ ocf, connHandle, payload });
  }

  public async leReadSuggestedDefaultDataLength(): Promise<LeSuggestedDefaultDataLength> {
    const ocf = HciOcfLeControllerCommands.ReadSuggestedDefaultDataLength;
    const result = await this.cmd.leController({ ocf });
    return LeSuggestedDefaultDataLength.outParams(result.returnParameters);
  }

  public async leWriteSuggestedDefaultDataLength(params: LeSuggestedDefaultDataLength): Promise<void> {
    const ocf = HciOcfLeControllerCommands.WriteSuggestedDefaultDataLength;
    const payload = LeSuggestedDefaultDataLength.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leReadLocalP256PublicKey(): Promise<void> {
    const ocf = HciOcfLeControllerCommands.ReadLocalP256PublicKey;
    await this.cmd.leController({ ocf });
  }

  public async leGenerateDhKeyV1(dhKey: DhKeyV1): Promise<void> {
    const ocf = HciOcfLeControllerCommands.GenerateDhKeyV1;
    const payload = DhKeyV1.inParams(dhKey);
    await this.cmd.leController({ ocf, payload });
  }

  public async leGenerateDhKeyV2(params: DhKeyV2): Promise<void> {
    const ocf = HciOcfLeControllerCommands.GenerateDhKeyV2;
    const payload = DhKeyV2.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leClearResolvingList(): Promise<void> {
    const  ocf = HciOcfLeControllerCommands.ClearResolvingList;
    await this.cmd.leController({ ocf });
  }

  public async leReadResolvingListSize(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadResolvingListSize;
    const result = await this.cmd.leController({ ocf });
    const params = result.returnParameters;
    if (!params|| params.length < 1) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return params.readUInt8(0);
  }

  public async leReadMaximumDataLength(): Promise<{
    supportedMaxTxOctets: number, supportedMaxTxTime: number,
    supportedMaxRxOctets: number, supportedMaxRxTime: number,
  }> {
    const ocf = HciOcfLeControllerCommands.ReadMaximumDataLength;
    const result = await this.cmd.leController({ ocf });
    const params = result.returnParameters;

    if (!params|| params.length < 8) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return {
      supportedMaxTxOctets: params.readUInt16LE(0),
      supportedMaxTxTime:   params.readUInt16LE(2),
      supportedMaxRxOctets: params.readUInt16LE(4),
      supportedMaxRxTime:   params.readUInt16LE(6),
    };
  }

  public async leReadPhy(connHandle: number): Promise<{
    txPhy: LePhy,
    rxPhy: LePhy,
  }> {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUInt16LE(connHandle, 0);

    const ocf = HciOcfLeControllerCommands.ReadPhy;
    const result = await this.cmd.leController({ ocf, connHandle, payload });
    const params = result.returnParameters;

    if (!params|| params.length < 4) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return {
      txPhy: params.readUInt8(2),
      rxPhy: params.readUInt8(3),
    };
  }

  public async leSetDefaultPhy(params: {
    txPhys?: LePhy, rxPhys?: LePhy,
  }): Promise<void> {
    let allPhys = 0, txPhys = 0, rxPhys = 0;

    // Is there ps reference for tx/rx phy?
    if (params.txPhys === undefined) {
      allPhys |= (1 << 0);
    } else {
      txPhys = 1 << params.txPhys;
    }
    if (params.rxPhys === undefined) {
      allPhys |= (1 << 1);
    } else {
      rxPhys = 1 << params.rxPhys;
    }

    const payload = Buffer.allocUnsafe(3);

    let o = 0;
    o = payload.writeUInt8(allPhys, o);
    o = payload.writeUInt8(txPhys,  o);
    o = payload.writeUInt8(rxPhys,  o);

    const ocf = HciOcfLeControllerCommands.SetDefaultPhy;
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetAdvertisingSetRandomAddress(
    advertisingHandle: number,
    advertisingRandomAddress: number
  ): Promise<void> {
    const payload = Buffer.allocUnsafe(7);

    let o = 0;
    o = payload.writeUIntLE(advertisingHandle,        o, 1);
    o = payload.writeUIntLE(advertisingRandomAddress, o, 6);

    const ocf = HciOcfLeControllerCommands.SetAdvertisingSetRandomAddress;
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetExtendedAdvertisingParameters(
    advertisingHandle: number,
    params: LeExtendedAdvertisingParameters
  ): Promise<number> {
    const ocf = HciOcfLeControllerCommands.SetExtendedAdvertisingParameters;
    const payload = LeExtendedAdvertisingParameters.inParams(advertisingHandle, params);
    const result = await this.cmd.leController({ ocf, payload });
    return LeExtendedAdvertisingParameters.outParams(result.returnParameters);
  }

  public async leSetExtendedAdvertisingData(advertisingHandle: number, params: {
    operation: LeAdvertisingDataOperation,
    fragment: boolean,
    data: Buffer,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(4 + params.data.length);

    let o = 0;
    o = payload.writeUIntLE(advertisingHandle,       o, 1);
    o = payload.writeUIntLE(params.operation,        o, 1);
    o = payload.writeUIntLE(params.fragment ? 0 : 1, o, 1);
    o = payload.writeUIntLE(params.data.length,      o, 1);
    params.data.copy(payload, o);

    const ocf = HciOcfLeControllerCommands.SetExtendedAdvertisingData;
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetExtendedScanResponseData(advertisingHandle: number, params: {
    operation: LeScanResponseDataOperation,
    fragment: boolean,
    data: Buffer,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(4 + params.data.length);

    let o = 0;
    o = payload.writeUIntLE(advertisingHandle,       o, 1);
    o = payload.writeUIntLE(params.operation,        o, 1);
    o = payload.writeUIntLE(params.fragment ? 0 : 1, o, 1);
    o = payload.writeUIntLE(params.data.length,      o, 1);
    params.data.copy(payload, o);

    const ocf = HciOcfLeControllerCommands.SetExtendedScanResponseData;
    await this.cmd.leController({ ocf, payload });
  }

  public async leReadNumberOfSupportedAdvertisingSets(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadNumberOfSupportedAdvertisingSets;
    const result = await this.cmd.leController({ ocf });
    if (!result.returnParameters || result.returnParameters.length < 1) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return result.returnParameters.readUInt8(0);
  }

  public async leSetExtendedScanParameters(params: LeExtendedScanParameters): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetExtendedScanParameters;
    const payload = LeExtendedScanParameters.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetExtendedScanEnable(params: {
    enable: boolean,
    filterDuplicates: LeScanFilterDuplicates,
    durationMs?: number,
    periodSec?: number,
  }): Promise<void> {
    const duration = Math.round((params.durationMs ?? 0) / 10);
    const period = Math.round((params.periodSec ?? 0) / 1.28);

    const payload = Buffer.allocUnsafe(1+1+2+2);

    let o = 0;
    o = payload.writeUIntLE(params.enable ? 1 : 0,   o, 1);
    o = payload.writeUIntLE(params.filterDuplicates, o, 1);
    o = payload.writeUIntLE(duration,                o, 2);
    o = payload.writeUIntLE(period,                  o, 2);

    const ocf = HciOcfLeControllerCommands.SetExtendedScanEnable;
    await this.cmd.leController({ ocf, payload });
  }

  public async sendAclData(params: {
    handle: number,
    boundary: AclDataBoundary,
    broadcast: AclDataBroadcast,
    data: Buffer,
  }): Promise<void> {
    const aclHdrSize = 4;
    const hdr = params.handle     <<  0 |
                params.boundary   << 12 |
                params.broadcast  << 14;

    const totalSize = aclHdrSize + params.data.length;
    const buffer = Buffer.allocUnsafe(totalSize);
    buffer.writeUInt16LE(hdr, 0);
    buffer.writeUInt16LE(params.data.length, 2);
    params.data.copy(buffer, aclHdrSize);

    await this.send(HciPacketType.HciAclData, buffer);
  }


  public onData(packetType: HciPacketType, data: Buffer): void {
    try {
      if (packetType === HciPacketType.HciEvent) {
        this.onEvent(data);
      }
    } catch (err) {
      debug(err);
    }
  }

  private onEvent(data: Buffer): void {
    if (data.length < 2) {
      debug(`hci event - invalid size ${data.length}`);
      return;
    }

    const eventCode     = data[0];
    const payloadLength = data[1];
    const payload       = data.slice(2);

    if (payloadLength !== payload.length) {
      debug(`(evt) invalid payload size: ${payloadLength}/${payload.length}`);
      return;
    }

    switch (eventCode) {
      case HciEvent.CommandComplete:
        if (payload.length < 4) {
          debug(`(evt-cmd_complete) invalid payload size: ${payload.length}`);
          return;
        }
        this.cmd.onCmdResult({
          status:           payload[3],
          numHciPackets:    payload[0],
          opcode:           payload.readUInt16LE(1),
          returnParameters: payload.slice(4),
        });
        break;
      case HciEvent.CommandStatus:
        if (payload.length < 4) {
          debug(`(evt-cmd_status) invalid payload size: ${payload.length}`);
          return;
        }
        this.cmd.onCmdResult({
          status:         payload[0],
          numHciPackets:  payload[1],
          opcode:         payload.readUInt16LE(2),
        });
        break;
      case HciEvent.LEMeta:
        this.onLeEvent(payload);
        break;
    }
  }

  private onLeEvent(data: Buffer): void {
    const eventType = data[0];
    const payload = data.slice(1);

    switch  (eventType) {
      case HciLeEvent.ExtendedAdvertisingReport:
        this.parseLeExtAdvertReport(payload);
        break;
    }
  }

  private parseLeExtAdvertReport(data: Buffer): void {
    const numReports = data[0];

    const reportsRaw: Partial<{
      eventType: number;
      addressType: number;
      address: number;
      primaryPhy: number;
      secondaryPhy: number;
      advertisingSid: number;
      txPower: number;
      rssi: number;
      periodicAdvInterval: number;
      directAddressType: number;
      directAddress: number;
      dataLength: number;
      data: Buffer;
    }>[] = [];

    let o = 1;

    for (let i = 0; i < numReports; i++) {
      reportsRaw.push({});
    }
    for (let i = 0; i < numReports; i++, o += 2) {
      reportsRaw[i].eventType = data.readUIntLE(o, 2);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].addressType = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 6) {
      reportsRaw[i].address = data.readUIntLE(o, 6);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].primaryPhy = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].secondaryPhy = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].advertisingSid = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].txPower = data.readIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].rssi = data.readIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 2) {
      reportsRaw[i].periodicAdvInterval = data.readUIntLE(o, 2);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].directAddressType = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 6) {
      reportsRaw[i].directAddress = data.readUIntLE(o, 6);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].dataLength = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++) {
      const dataLength = reportsRaw[i].dataLength!;
      if (dataLength === 0) {
        continue;
      }
      reportsRaw[i].data = data.slice(o, o + dataLength);
      o += dataLength;
    }

    const powerOrNull = (v: number): number|null => {
      return v !== 0x7F ? v : null;
    };

    const reports = reportsRaw.map<LeExtAdvReport>((reportRaw) => {
      return {
        eventType:              LeExtAdvEventTypeParser.parse(reportRaw.eventType!),
        addressType:            reportRaw.addressType!,
        address:                Address.from(reportRaw.address!),
        primaryPhy:             reportRaw.primaryPhy!,
        secondaryPhy:           reportRaw.secondaryPhy!,
        advertisingSid:         reportRaw.advertisingSid!,
        txPower:                powerOrNull(reportRaw.txPower!),
        rssi:                   powerOrNull(reportRaw.rssi!),
        periodicAdvIntervalMs:  reportRaw.periodicAdvInterval! * 1.25,
        directAddressType:      reportRaw.directAddressType!,
        directAddress:          reportRaw.directAddress!,
        data:                   reportRaw.data ?? null,
      };
    });

    for (const report of reports) {
      this.emit('ext-adv-report', report);
    }
  }
}
