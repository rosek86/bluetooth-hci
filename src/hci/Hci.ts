import { EventEmitter } from 'events';
import Debug from 'debug';

import { HciPacketType } from './HciPacketType';

import { getHciErrorMessage, HciError, HciErrorCode, makeHciError } from './HciError';
import { HciDisconnectReason } from './HciError';
import { HciParserError, makeParserError } from './HciError';

import { Address } from '../utils/Address';
import { HciCmd } from './HciCmd';
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
  LeSupportedStates, LeEvents, LeSetEventsMask,
  LeBufferSize, LeReadBufferSize, LeReadBufferSizeV2, LeBufferSizeV2, LeReadLocalSupportedFeatures,
  LeLocalSupportedFeatures, LeSetRandomAddress, LeAdvertisingParameters, LeSetAdvertisingParameters,
  LeReadAdvertisingPhysicalChannelTxPower, LeSetAdvertisingScanResponseData, LeSetAdvertisingEnable,
  LeScanParameters, LeCreateConnection, LeSetScanParameters, LeSetScanEnabled, LeConnectionUpdate,
  LeReadWhiteListSize, LeWhiteList, LeExtendedAdvertisingParameters, LeExtendedScanParameters,
  LeReadChannelMap, LeEncrypt, LeRand, LeEnableEncryption, LeLongTermKeyRequestReply,
  LeLongTermKeyRequestNegativeReply, LeReceiverTestV1, LeReceiverTestV2, LeReceiverTestV3,
  LeTransmitterTestV1, LeTransmitterTestV2, LeTransmitterTestV3, LeTransmitterTestV4, LeTestEnd,
  LeRemoteConnectionParameterRequestReply, LeRemoteConnectionParameterRequestNegativeReply,
  LeDataLength, LeSuggestedDefaultDataLength, LeDhKeyV1, LeDhKeyV2, LeAddDeviceToResolvingList,
  LeRemoveDeviceFromResolvingList, LeReadResolvingListSize, LeMaximumDataLength, LeTxRxPhy,
  ConnectionHandle, DefaultTxRxPhy, LeSetTxRxPhy, LeAdvertisingSetRandomAddress,
  LeExtendedAdvertisingData, LeExtendedScanResponseData, LeExtendedScanEnabled,
  LeNumberOfSupportedAdvertisingSets, LeExtendedAdvertisingEnable, LePrivacyMode,
  LeTransmitPower, LeExtendedCreateConnection, LeReadPeerResolvableAddress, LeLocalPeerResolvableAddress,
} from './HciLeController';

import {
  DisconnectionCompleteEvent, EncryptionChangeEvent, HciEvent, HciLeEvent,
  LeReadRemoteFeaturesComplete, LeReadRemoteFeaturesCompleteEvent, LeConnectionUpdateComplete,
  LeConnectionUpdateCompleteEvent, LeChannelSelAlgoEvent, LeChannelSelAlgo, LeLongTermKeyRequest,
  LeConnectionComplete, LeConnectionCompleteEvent,  LeExtAdvReport, LeAdvReport,
  LeEnhConnectionComplete, LeEnhConnectionCompleteEvent, LeRemoteConnectionParameterRequest,
  LeLongTermKeyRequestEvent, LeRemoteConnectionParameterRequestEvent, LeDataLengthChange,
  LeReadLocalP256PublicKeyComplete, LeGenerateDhKeyComplete, LeGenerateDhKeyCompleteEvent,
  LeDirectedAdvertisingReport, LeDirectedAdvertisingReportEvent, LePhyUpdateComplete,
  LePhyUpdateCompleteEvent, LeDataLengthChangeEvent, ReadRemoteVersionInformationComplete,
  ReadRemoteVersionInformationCompleteEvent, LeAdvertisingSetTerminated,
  LeAdvertisingSetTerminatedEvent,
  EncryptionKeyRefreshComplete,
  NumberOfCompletedPacketsEntry,
  LeReadLocalP256PublicKeyCompleteEvent
} from './HciEvent';

import { AclDataPacket } from '../acl/Acl';

const debug = Debug('nble-hci');

interface HciInit {
  cmdTimeout?: number;
  send: (pt: HciPacketType, data: Buffer) => void;
}

type HciConnEvent = 'DisconnectionComplete' |
                    'EncryptionChange' |
                    'EncryptionKeyRefreshComplete' |
                    'ReadRemoteVersionInformationComplete' |
                    'NumberOfCompletedPackets' |
                    'LeConnectionComplete' |
                    'LeConnectionUpdateComplete' |
                    'LeReadRemoteFeaturesComplete' |
                    'LeLongTermKeyRequest' |
                    'LeRemoteConnectionParameterRequest' |
                    'LeDataLengthChange' |
                    'LeReadLocalP256PublicKeyComplete' |
                    'LeEnhancedConnectionComplete' |
                    'LePhyUpdateComplete' |
                    'LeChannelSelectionAlgorithm';

export declare interface Hci {
  on(event: 'DisconnectionComplete',                listener: (err: Error|null, event: DisconnectionCompleteEvent) => void): this;
  on(event: 'EncryptionChange',                     listener: (err: Error|null, event: EncryptionChangeEvent) => void): this;
  on(event: 'EncryptionKeyRefreshComplete',         listener: (err: Error|null, event: EncryptionKeyRefreshComplete) => void): this;
  on(event: 'ReadRemoteVersionInformationComplete', listener: (err: Error|null, event: ReadRemoteVersionInformationCompleteEvent) => void): this;
  on(event: 'NumberOfCompletedPackets',             listener: (err: Error|null, event: NumberOfCompletedPacketsEntry) => void): this;
  on(event: 'LeConnectionComplete',                 listener: (err: Error|null, event: LeConnectionCompleteEvent) => void): this;
  on(event: 'LeConnectionUpdateComplete',           listener: (err: Error|null, event: LeConnectionUpdateCompleteEvent) => void): this;
  on(event: 'LeReadRemoteFeaturesComplete',         listener: (err: Error|null, event: LeReadRemoteFeaturesCompleteEvent) => void): this;
  on(event: 'LeLongTermKeyRequest',                 listener: (err: Error|null, event: LeLongTermKeyRequestEvent) => void): this;
  on(event: 'LeRemoteConnectionParameterRequest',   listener: (err: Error|null, event: LeRemoteConnectionParameterRequestEvent) => void): this;
  on(event: 'LeDataLengthChange',                   listener: (err: Error|null, event: LeDataLengthChangeEvent) => void): this;
  on(event: 'LeReadLocalP256PublicKeyComplete',     listener: (err: Error|null, event: LeReadLocalP256PublicKeyCompleteEvent) => void): this;
  on(event: 'LeEnhancedConnectionComplete',         listener: (err: Error|null, event: LeEnhConnectionCompleteEvent) => void): this;
  on(event: 'LePhyUpdateComplete',                  listener: (err: Error|null, event: LePhyUpdateCompleteEvent) => void): this;
  on(event: 'LeChannelSelectionAlgorithm',          listener: (err: Error|null, event: LeChannelSelAlgoEvent) => void): this;
  on<T>(event: HciConnEvent,                        listener: (err: Error|null, event: T) => void): this;

  on(event: 'LeScanTimeout',                        listener: () => void): this;
  on(event: 'LeAdvertisingReport',                  listener: (report: LeAdvReport) => void): this;
  on(event: 'LeDirectedAdvertisingReport',          listener: (report: LeDirectedAdvertisingReportEvent) => void): this;
  on(event: 'LeExtendedAdvertisingReport',          listener: (report: LeExtAdvReport) => void): this;
  on(event: 'LeAdvertisingSetTerminated',           listener: (err: Error|null, event: LeAdvertisingSetTerminatedEvent) => void): this;
  on(event: 'LeGenerateDhKeyComplete',              listener: (err: Error|null, event: LeGenerateDhKeyCompleteEvent) => void): this;

  on(event: 'AclData',                              listener: (connectionHandle: number, event: AclDataPacket) => void): this;
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

  public async disconnect(
    connectionHandle: number,
    reason: HciDisconnectReason = HciDisconnectReason.ConnTerminatedByRemoteUser
  ): Promise<void> {
    const payload = Buffer.alloc(3);
    payload.writeUIntLE(connectionHandle, 0, 2);
    payload.writeUIntLE(reason,           2, 1);
    const ocf = HciOcfLinkControlCommands.Disconnect;
    await this.cmd.linkControl({ ocf, payload });
  }

  public async readRemoteVersionInformation(connectionHandle: number): Promise<void> {
    const payload = Buffer.alloc(2);
    payload.writeUInt16LE(connectionHandle, 0);
    const ocf = HciOcfLinkControlCommands.ReadRemoteVersionInformation;
    await this.cmd.linkControl({ ocf, payload });
  }

  // Control and Baseband

  public async setEventMask(events: Partial<EventMask> = {}): Promise<void> {
    await this.cmd.controlAndBaseband(SetEventMask.inParams(events));
  }

  public async reset(): Promise<void> {
    const ocf = HciOcfControlAndBasebandCommands.Reset;
    await this.cmd.controlAndBaseband({ ocf });
  }

  public async readTransmitPowerLevel(connectionHandle: number, type: ReadTransmitPowerLevelType): Promise<number> {
    const params = ReadTransmitPowerLevel.inParams(connectionHandle, type);
    const result = await this.cmd.controlAndBaseband(params);
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

  public async readAuthenticatedPayloadTimeout(connectionHandle: number): Promise<number> {
    const ocf = HciOcfControlAndBasebandCommands.ReadAuthenticatedPayloadTimeout;
    const payload = ReadAuthenticatedPayloadTimeout.inParams(connectionHandle);
    const result = await this.cmd.controlAndBaseband({ ocf, connectionHandle, payload });
    return ReadAuthenticatedPayloadTimeout.outParams(result.returnParameters);
  }

  public async writeAuthenticatedPayloadTimeout(connectionHandle: number, timeoutMs: number): Promise<void> {
    const ocf = HciOcfControlAndBasebandCommands.WriteAuthenticatedPayloadTimeout;
    const payload = WriteAuthenticatedPayloadTimeout.inParams(connectionHandle, timeoutMs);
    await this.cmd.controlAndBaseband({ ocf, connectionHandle, payload });
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

  public async readBdAddr(): Promise<Address> {
    const ocf = HciOcfInformationParameters.ReadBdAddr;
    const result = await this.cmd.informationParameters({ ocf });
    return ReadBdAddr.outParams(result.returnParameters);
  }

  public async readLocalSupportedCommands(): Promise<LocalSupportedCommands> {
    const ocf = HciOcfInformationParameters.ReadLocalSupportedCommands;
    const result = await this.cmd.informationParameters({ ocf });
    return ReadLocalSupportedCommands.outParams(result.returnParameters);
  }

  public async readRssi(connectionHandle: number): Promise<number> {
    const ocf = HciOcfStatusParameters.ReadRssi;
    const payload = ReadRssi.inParams(connectionHandle);
    const result = await this.cmd.statusParameters({ ocf, connectionHandle, payload });
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
    const payload = Buffer.alloc(5);
    payload.writeUIntLE(channelMap, 0, 5);
    const ocf = HciOcfLeControllerCommands.SetHostChannelClassification;
    await this.cmd.leController({ ocf, payload });
  }

  public async leReadChannelMap(connectionHandle: number): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadChannelMap;
    const payload = LeReadChannelMap.inParams(connectionHandle);
    const result = await this.cmd.leController({ ocf, connectionHandle, payload });
    return LeReadChannelMap.outParams(result.returnParameters);
  }

  public async leReadRemoteFeatures(connectionHandle: number): Promise<void> {
    const payload = Buffer.alloc(2);
    payload.writeUIntLE(connectionHandle, 0, 2);
    const ocf = HciOcfLeControllerCommands.ReadRemoteFeatures;
    await this.cmd.leController({ ocf, payload });
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

  public async leEnableEncryption(connectionHandle: number, params: LeEnableEncryption): Promise<void> {
    const ocf = HciOcfLeControllerCommands.EnableEncryption;
    const payload = LeEnableEncryption.inParams(connectionHandle, params);
    await this.cmd.leController({ ocf, connectionHandle, payload });
  }

  public async leLongTermKeyRequestReply(connectionHandle: number, longTermKey: Buffer): Promise<void> {
    const ocf = HciOcfLeControllerCommands.LongTermKeyRequestReply;
    const payload = LeLongTermKeyRequestReply.inParams(connectionHandle, longTermKey);
    await this.cmd.leController({ ocf, connectionHandle, payload });
  }

  public async leLongTermKeyRequestNegativeReply(connectionHandle: number): Promise<void> {
    const ocf = HciOcfLeControllerCommands.LongTermKeyRequestNegativeReply;
    const payload = LeLongTermKeyRequestNegativeReply.inParams(connectionHandle);
    await this.cmd.leController({ ocf, connectionHandle, payload });
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
    connectionHandle: number,
    params: LeRemoteConnectionParameterRequestReply
  ): Promise<void> {
    const ocf = HciOcfLeControllerCommands.RemoteConnectionParameterRequestReply;
    const payload = LeRemoteConnectionParameterRequestReply.inParams(connectionHandle, params);
    await this.cmd.leController({ ocf, connectionHandle, payload });
  }

  public async leRemoteConnectionParameterRequestNegativeReply(
    connectionHandle: number,
    reason: HciErrorCode
  ): Promise<void> {
    const ocf = HciOcfLeControllerCommands.RemoteConnectionParameterRequestNegativeReply;
    const payload = LeRemoteConnectionParameterRequestNegativeReply.inParams(connectionHandle, reason);
    await this.cmd.leController({ ocf, connectionHandle, payload });
  }

  public async leSetDataLength(connectionHandle: number, params: LeDataLength): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetDataLength;
    const payload = LeDataLength.inParams(connectionHandle, params);
    await this.cmd.leController({ ocf, connectionHandle, payload });
  }

  public async leSetDataLengthAwait(connectionHandle: number, params: LeDataLength): Promise<LeDataLengthChangeEvent> {
    const waitEvent = this.waitEvent<LeDataLengthChangeEvent>(connectionHandle, 'LeDataLengthChange');
    await this.leSetDataLength(connectionHandle, params);
    return await waitEvent;
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

  public async leGenerateDhKeyV1(dhKey: LeDhKeyV1): Promise<void> {
    const ocf = HciOcfLeControllerCommands.GenerateDhKeyV1;
    const payload = LeDhKeyV1.inParams(dhKey);
    await this.cmd.leController({ ocf, payload });
  }

  public async leGenerateDhKeyV2(params: LeDhKeyV2): Promise<void> {
    const ocf = HciOcfLeControllerCommands.GenerateDhKeyV2;
    const payload = LeDhKeyV2.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leAddDeviceToResolvingList(params: LeAddDeviceToResolvingList): Promise<void> {
    const ocf = HciOcfLeControllerCommands.AddDeviceToResolvingList;
    const payload = LeAddDeviceToResolvingList.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leRemoveDeviceFromResolvingList(params: LeRemoveDeviceFromResolvingList): Promise<void> {
    const ocf = HciOcfLeControllerCommands.RemoveDeviceFromResolvingList;
    const payload = LeRemoveDeviceFromResolvingList.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leClearResolvingList(): Promise<void> {
    const  ocf = HciOcfLeControllerCommands.ClearResolvingList;
    await this.cmd.leController({ ocf });
  }

  public async leReadResolvingListSize(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadResolvingListSize;
    const result = await this.cmd.leController({ ocf });
    return LeReadResolvingListSize.outParams(result.returnParameters);
  }

  public async leReadPeerResolvableAddress(params: LeReadPeerResolvableAddress): Promise<Address> {
    const ocf = HciOcfLeControllerCommands.ReadPeerResolvableAddress;
    const payload = LeReadPeerResolvableAddress.inParams(params);
    const result = await this.cmd.leController({ ocf, payload });
    return LeReadPeerResolvableAddress.outParams(result.returnParameters);
  }

  public async leReadLocalResolvableAddress(params: LeLocalPeerResolvableAddress): Promise<Address> {
    const ocf = HciOcfLeControllerCommands.ReadLocalResolvableAddress;
    const payload = LeLocalPeerResolvableAddress.inParams(params);
    const result = await this.cmd.leController({ ocf, payload });
    return LeLocalPeerResolvableAddress.outParams(result.returnParameters);
  }

  public async leSetAddressResolutionEnable(enable: boolean): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetAddressResolutionEnable;
    const payload = Buffer.from([ enable ? 1 : 0 ]);
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetResolvablePrivateAddressTimeout(seconds: number): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetResolvablePrivateAddressTimeout;
    const payload = Buffer.alloc(2);
    payload.writeUInt16LE(seconds);
    await this.cmd.leController({ ocf, payload });
  }

  public async leReadMaximumDataLength(): Promise<LeMaximumDataLength> {
    const ocf = HciOcfLeControllerCommands.ReadMaximumDataLength;
    const result = await this.cmd.leController({ ocf });
    return LeMaximumDataLength.outParams(result.returnParameters);
  }

  public async leReadPhy(connectionHandle: number): Promise<LeTxRxPhy> {
    const ocf = HciOcfLeControllerCommands.ReadPhy;
    const payload = ConnectionHandle.inParams(connectionHandle);
    const result = await this.cmd.leController({ ocf, connectionHandle, payload });
    return LeTxRxPhy.outParams(result.returnParameters);
  }

  public async leSetDefaultPhy(params: Partial<DefaultTxRxPhy>): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetDefaultPhy;
    const payload = DefaultTxRxPhy.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetPhy(connectionHandle: number, params: Partial<LeSetTxRxPhy>): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetPhy;
    const payload = LeSetTxRxPhy.inParams(connectionHandle, params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetAdvertisingSetRandomAddress(advertHandle: number, randomAddress: Address): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetAdvertisingSetRandomAddress;
    const payload = LeAdvertisingSetRandomAddress.inParams(advertHandle, randomAddress);
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetExtendedAdvertisingParameters(
    advertHandle: number,
    params: LeExtendedAdvertisingParameters
  ): Promise<number> {
    const ocf = HciOcfLeControllerCommands.SetExtendedAdvertisingParameters;
    const payload = LeExtendedAdvertisingParameters.inParams(advertHandle, params);
    const result = await this.cmd.leController({ ocf, payload });
    return LeExtendedAdvertisingParameters.outParams(result.returnParameters);
  }

  public async leSetExtendedAdvertisingData(advertHandle: number, params: LeExtendedAdvertisingData): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetExtendedAdvertisingData;
    const payload = LeExtendedAdvertisingData.inParams(advertHandle, params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetExtendedScanResponseData(advertHandle: number, params: LeExtendedScanResponseData): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetExtendedScanResponseData;
    const payload = LeExtendedScanResponseData.inParams(advertHandle, params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetExtendedAdvertisingEnable(params: LeExtendedAdvertisingEnable) {
    const ocf = HciOcfLeControllerCommands.SetExtendedAdvertisingEnable;
    const payload = LeExtendedAdvertisingEnable.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leReadMaximumAdvertisingDataLength(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadMaximumAdvertisingDataLength;
    const result = await this.cmd.leController({ ocf });
    const params = result.returnParameters;
    if (!params || params.length < 2) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return params.readUInt16LE(0);
  }

  public async leReadNumberOfSupportedAdvertisingSets(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadNumberOfSupportedAdvertisingSets;
    const result = await this.cmd.leController({ ocf });
    return LeNumberOfSupportedAdvertisingSets.outParams(result.returnParameters);
  }

  public async leRemoveAdvertisingSet(advertHandle: number): Promise<void> {
    const payload = Buffer.from([ advertHandle ]);
    const ocf = HciOcfLeControllerCommands.RemoveAdvertisingSet;
    await this.cmd.leController({ ocf, payload });
  }

  public async leClearAdvertisingSets(): Promise<void> {
    const ocf = HciOcfLeControllerCommands.ClearAdvertisingSets;
    await this.cmd.leController({ ocf });
  }

  public async leSetExtendedScanParameters(params: LeExtendedScanParameters): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetExtendedScanParameters;
    const payload = LeExtendedScanParameters.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetExtendedScanEnable(params: LeExtendedScanEnabled): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetExtendedScanEnable;
    const payload = LeExtendedScanEnabled.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leExtendedCreateConnection(params: LeExtendedCreateConnection): Promise<void> {
    const ocf = HciOcfLeControllerCommands.ExtendedCreateConnection;
    const payload = LeExtendedCreateConnection.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async leReadTransmitPower(): Promise<LeTransmitPower> {
    const ocf = HciOcfLeControllerCommands.ReadTransmitPower;
    const result = await this.cmd.leController({ ocf });
    return LeTransmitPower.outParams(result.returnParameters);
  }

  public async leSetPrivacyMode(params: LePrivacyMode): Promise<void> {
    const ocf = HciOcfLeControllerCommands.SetPrivacyMode;
    const payload = LePrivacyMode.inParams(params);
    await this.cmd.leController({ ocf, payload });
  }

  public async writeAclData(connectionHandle: number, packet: AclDataPacket): Promise<void> {
    const aclHdrSize = 4;
    const hdr = connectionHandle <<  0 |
                packet.boundary  << 12 |
                packet.broadcast << 14;

    const totalSize = aclHdrSize + packet.data.length;
    const buffer = Buffer.alloc(totalSize);
    buffer.writeUInt16LE(hdr, 0);
    buffer.writeUInt16LE(packet.data.length, 2);
    packet.data.copy(buffer, aclHdrSize);

    await this.send(HciPacketType.HciAclData, buffer);
  }

  public onData(packetType: HciPacketType, data: Buffer): void {
    try {
      if (packetType === HciPacketType.HciEvent) {
        return this.onHciEvent(data);
      }
      if (packetType === HciPacketType.HciAclData) {
        return this.onAclData(data);
      }
      if (packetType === HciPacketType.HciCommand) {
        debug('on-data-hci-cmd');
        return;
      }
    } catch (err) {
      debug(err);
    }
  }

  private onHciEvent(data: Buffer): void {
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

    if (eventCode !== HciEvent.LeMeta) {
      debug('on-hci-event', HciEvent[eventCode]);
    }

    switch (eventCode) {
      case HciEvent.DisconnectionComplete:
        this.onDisconnectionComplete(payload);
        break;
      case HciEvent.EncryptionChange:
        this.onEncryptionChange(payload);
        break;
      case HciEvent.ReadRemoteVersionInformationComplete:
        this.onReadRemoteVersionInformationComplete(payload);
        break;
      case HciEvent.CommandComplete:
        this.onCommandComplete(payload);
        break;
      case HciEvent.CommandStatus:
        this.onCommandStatus(payload);
        break;
      case HciEvent.NumberOfCompletedPackets:
        this.onNumberOfCompletedPackets(payload);
        break;
      case HciEvent.EncryptionKeyRefreshComplete:
        this.onEncryptionKeyRefreshComplete(payload);
        break;
      case HciEvent.LeMeta:
        this.onLeEvent(payload);
        break;
      default:
        debug('on-event: unknown event');
        break;
    }
  }

  private emitEvent<T>(label: string, status: HciErrorCode, event: T): void {
    if (status === HciErrorCode.Success) {
      this.emit(label, null, event);
    } else {
      this.emit(label, makeHciError(status), event);
    }
  }

  private onDisconnectionComplete(payload: Buffer): void {
    if (payload.length !== 4) {
      debug(`onDisconnectionComplete: invalid size ${payload.length}`);
    }

    let o = 0;
    const status            = payload.readUIntLE(o, 1); o += 1;
    const connectionHandle  = payload.readUIntLE(o, 2); o += 2;
    const reasonCode        = payload.readUIntLE(o, 1); o += 1;

    const event: DisconnectionCompleteEvent = {
      connectionHandle,
      reason: {
        code: reasonCode,
        message: getHciErrorMessage(reasonCode),
      },
    };

    this.emitEvent('DisconnectionComplete', status, event);
  }

  private onEncryptionChange(payload: Buffer): void {
    if (payload.length !== 4) {
      debug(`onEncryptionChange: invalid size ${payload.length}`);
    }

    let o = 0;
    const status            = payload.readUIntLE(o, 1); o += 1;
    const connectionHandle  = payload.readUIntLE(o, 2); o += 2;
    const encEnabled        = payload.readUIntLE(o, 1); o += 1;

    const event: EncryptionChangeEvent = { connectionHandle, encEnabled };

    this.emitEvent('EncryptionChange', status, event);
  }

  private onReadRemoteVersionInformationComplete(data: Buffer): void {
    const { status, event } = ReadRemoteVersionInformationComplete.parse(data);
    this.emitEvent('ReadRemoteVersionInformationComplete', status, event);
  }

  private onCommandComplete(payload: Buffer): void {
    if (payload.length < 4) {
      debug(`onCommandComplete: invalid size ${payload.length}`);
      return;
    }

    this.cmd.onCmdResult({
      status:           payload[3],
      numHciPackets:    payload[0],
      opcode:           payload.readUInt16LE(1),
      returnParameters: payload.slice(4),
    });
  }

  private onCommandStatus(payload: Buffer): void {
    if (payload.length < 4) {
      debug(`onCommandStatus: invalid size ${payload.length}`);
      return;
    }

    this.cmd.onCmdResult({
      status:         payload[0],
      numHciPackets:  payload[1],
      opcode:         payload.readUInt16LE(2),
    });
  }

  private onNumberOfCompletedPackets(payload: Buffer): void {
    const connectionHandles: number[] = [];
    const numCompletedPackets: number[] = [];

    let o = 0;
    const numHandles = payload.readUIntLE(o, 1); o += 1;

    for (let i = 0; i < numHandles; i++, o += 2) {
      connectionHandles.push(payload.readUIntLE(o, 2));
    }
    for (let i = 0; i < numHandles; i++, o += 2) {
      numCompletedPackets.push(payload.readUIntLE(o, 2));
    }

    for (let i = 0; i < numHandles; i++) {
      this.emit('NumberOfCompletedPackets', null, {
        connectionHandle: connectionHandles[i],
        numCompletedPackets: numCompletedPackets[i],
      });
    }
  }

  private onEncryptionKeyRefreshComplete(data: Buffer): void {
    if (data.length !== 3) {
      debug(`onEncryptionKeyRefreshComplete: invalid size ${data.length}`);
      return;
    }

    let o = 0;
    const status            = data.readUIntLE(o, 1); o += 1;
    const connectionHandle  = data.readUIntLE(o, 2); o += 2;

    const event: EncryptionKeyRefreshComplete = { connectionHandle };
    this.emitEvent('EncryptionKeyRefreshComplete', status, event);
  }

  private onLeEvent(data: Buffer): void {
    const eventCode = data[0];
    const payload = data.slice(1);

    if (eventCode !== HciEvent.LeMeta) {
      debug('on-hci-le-event', HciLeEvent[eventCode]);
    }

    switch  (eventCode) {
      case HciLeEvent.ConnectionComplete:
        this.onLeConnectionComplete(payload);
        break;
      case HciLeEvent.AdvertisingReport:
        this.onLeAdvertisingReport(payload);
        break;
      case HciLeEvent.ConnectionUpdateComplete:
        this.onLeConnectionUpdateComplete(payload);
        break;
      case HciLeEvent.ReadRemoteFeaturesComplete:
        this.onLeReadRemoteFeaturesComplete(payload);
        break;
      case HciLeEvent.LongTermKeyRequest:
        this.onLeLongTermKeyRequest(payload);
        break;
      case HciLeEvent.RemoteConnectionParameterRequest:
        this.onLeRemoteConnectionParameterRequest(payload);
        break;
      case HciLeEvent.DataLengthChange:
        this.onLeDataLengthChange(payload);
        break;
      case HciLeEvent.ReadLocalP256PublicKeyComplete:
        this.onLeReadLocalP256PublicKeyComplete(payload);
        break;
      case HciLeEvent.GenerateDhKeyComplete:
        this.onLeGenerateDhKeyComplete(payload);
        break;
      case HciLeEvent.EnhancedConnectionComplete:
        this.onLeEnhancedConnectionComplete(payload);
        break;
      case HciLeEvent.DirectedAdvertisingReport:
        this.onLeDirectedAdvertisingReport(payload);
        break;
      case HciLeEvent.PhyUpdateComplete:
        this.onLePhyUpdateComplete(payload);
        break;
      case HciLeEvent.ExtendedAdvertisingReport:
        this.onLeExtendedAdvertisingReport(payload);
        break;
      case HciLeEvent.ScanTimeout:
        this.onLeScanTimeout();
        break;
      case HciLeEvent.AdvertisingSetTerminated:
        this.onLeAdvertisingSetTerminated(payload);
        break;
      case HciLeEvent.ChannelSelectionAlgorithm:
        this.onLeChannelSelectionAlgorithm(payload);
        break;
      default:
        debug('on-le-event: unknown event');
        break
    }
  }

  private onLeConnectionComplete(data: Buffer): void {
    const { status, event } = LeConnectionComplete.parse(data);
    this.emitEvent('LeConnectionComplete', status, event);
  }

  private onLeAdvertisingReport(data: Buffer): void {
    const reports = LeAdvReport.parse(data);

    for (const report of reports) {
      this.emit('LeAdvertisingReport', report);
    }
  }

  private onLeConnectionUpdateComplete(data: Buffer): void {
    const { status, event } = LeConnectionUpdateComplete.parse(data);
    this.emitEvent('LeConnectionUpdateComplete', status, event);
  }

  private onLeReadRemoteFeaturesComplete(data: Buffer): void {
    const { status, event } = LeReadRemoteFeaturesComplete.parse(data);
    this.emitEvent('LeReadRemoteFeaturesComplete', status, event);
  }

  private onLeLongTermKeyRequest(data: Buffer): void {
    const event = LeLongTermKeyRequest.parse(data);
    this.emit('LeLongTermKeyRequest', null, event);
  }

  private onLeRemoteConnectionParameterRequest(data: Buffer): void {
    const event = LeRemoteConnectionParameterRequest.parse(data);
    this.emit('LeRemoteConnectionParameterRequest', null, event);
  }

  private onLeDataLengthChange(data: Buffer): void {
    const event = LeDataLengthChange.parse(data);
    this.emit('LeDataLengthChange', null, event);
  }

  private onLeReadLocalP256PublicKeyComplete(data: Buffer): void {
    const { status, event } = LeReadLocalP256PublicKeyComplete.parse(data);
    this.emitEvent('LeReadLocalP256PublicKeyComplete', status, event);
  }

  private onLeGenerateDhKeyComplete(data: Buffer): void {
    const { status, event } = LeGenerateDhKeyComplete.parse(data);
    this.emitEvent('LeGenerateDhKeyComplete', status, event);
  }

  private onLeEnhancedConnectionComplete(data: Buffer): void {
    const { status, event } = LeEnhConnectionComplete.parse(data);
    this.emitEvent('LeEnhancedConnectionComplete', status, event);
  }

  private onLeDirectedAdvertisingReport(data: Buffer): void {
    const reports = LeDirectedAdvertisingReport.parse(data);

    for (const report of reports) {
      this.emit('LeDirectedAdvertisingReport', report);
    }
  }

  private onLePhyUpdateComplete(data: Buffer): void {
    const { status, event } = LePhyUpdateComplete.parse(data);
    this.emitEvent('LePhyUpdateComplete', status, event);
  }

  private onLeExtendedAdvertisingReport(data: Buffer): void {
    const reports = LeExtAdvReport.parse(data);

    for (const report of reports) {
      this.emit('LeExtendedAdvertisingReport', report);
    }
  }

  private onLeScanTimeout(): void {
    this.emit('LeScanTimeout');
  }

  private onLeAdvertisingSetTerminated(data: Buffer): void {
    const { status, event } = LeAdvertisingSetTerminated.parse(data);
    this.emitEvent('LeAdvertisingSetTerminated', status, event);
  }

  private onLeChannelSelectionAlgorithm(data: Buffer): void {
    const event = LeChannelSelAlgo.parse(data);
    this.emit('LeChannelSelectionAlgorithm', null, event);
  }

  private onAclData(data: Buffer): void {
    debug(`acl-data`);
    const aclHdrSize = 4;

    const hdr  = data.readUIntLE(0, 2);
    const size = data.readUIntLE(2, 2);

    const rxSize = data.length - aclHdrSize;

    if (size !== rxSize) {
      debug(`acl-data: invalid size ${size} vs ${rxSize}`);
    }

    const connectionHandle  = (hdr >>  0) & 0x0FFF;
    const boundary          = (hdr >> 12) & 0x0003;
    const broadcast         = (hdr >> 14) & 0x0003;

    const result: AclDataPacket = {
      boundary,
      broadcast,
      data: data.slice(aclHdrSize),
    };

    this.emit('AclData', connectionHandle, result);
  }

  // Utils
  public async waitEvent<T extends { connectionHandle: number }>(connectionHandle: number, event: HciConnEvent): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const cleanup = () => {
        this.off(event, onEvent);
        this.off('DisconnectionComplete', onDisconnected);
      };
      const onEvent = (err: Error | null, res: T) => {
        if (res.connectionHandle === connectionHandle) {
          cleanup();
          err ? reject(err) : resolve(res);
        }
      };
      const onDisconnected = (err: Error | null, event: DisconnectionCompleteEvent) => {
        if (connectionHandle === event.connectionHandle) {
          cleanup();
          reject(new HciError(event.reason.code));
        }
      };
      this.on(event, onEvent);
      this.on('DisconnectionComplete', onDisconnected);
    });
  }
}
