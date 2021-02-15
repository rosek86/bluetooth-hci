import { EventEmitter } from 'events';
import Debug from 'debug';

import { HciPacketType } from './HciPacketType';
import HciError from './HciError';
import { HciEvent, HciLeEvent } from './HciEvent';
import { HciErrorCode } from './HciError';
import {
  HciOgf, HciOcfInformationParameters, HciOcfControlAndBasebandCommands, HciOcfLeControllerCommands
} from './HciOgfOcf'
import {
  LeAdvertisingChannelMap, LeAdvertisingDataOperation, LeAdvertisingEventProperties,
  LeAdvertisingFilterPolicy, LeOwnAddressType, LePeerAddressType, LePhy, LePrimaryAdvertisingPhy,
  LeSecondaryAdvertisingPhy, LeSupportedStates, LeScanResponseDataOperation, LeScanningFilterPolicy,
  LeScanningPhy, LeScanType, LeScanFilterDuplicates, LeAdvertisingType, LeWhiteListAddressType,
  LeModulationIndex, LeCteType, LeTxTestPayload, LeTxPhy, LeMinTransmitPowerLevel, LeMaxTransmitPowerLevel
} from './HciLe';

const debug = Debug('nble-hci');

interface HciInit {
  cmdTimeout?: number;
  send: (pt: HciPacketType, data: Buffer) => void;
}

interface HciCommand {
  opcode: number;
  connHandle?: number;
  payload?: Buffer;
}

// enum HciEventCode {
//   CommandComplete = 0x0E,
//   CommandStatus   = 0x0F
// }

interface HciEvtCmdComplete {
  numHciPackets: number;
  opcode: number;
  status: number;
  returnParameters: Buffer;
}

interface HciEvtCmdStatus {
  status: number;
  numHciPackets: number;
  opcode: number;
}

class HciOpcode {
  public static build(opcode: { ogf: number, ocf: number }): number {
    return opcode.ogf << 10 | opcode.ocf;
  }

  public static expand(opcode: number): { ogf: number, ocf: number } {
    const ogf = opcode >> 10;
    const ocf = opcode & 1023;
    return { ogf, ocf };
  }
}

enum HciParserError {
  InvalidPayloadSize,
  Busy,
  Timeout,
}

// TODO: should I reverse parameter buffers?

export default class Hci extends EventEmitter {
  private sendRaw: (pt: HciPacketType, data: Buffer) => void;
  private cmdTimeout: number;

  private onCmdComplete: ((_: HciEvtCmdComplete) => void) | null = null;
  private onCmdStatus: ((_: HciEvtCmdStatus) => void) | null = null;

  public constructor(init: HciInit) {
    super();

    this.sendRaw = init.send;
    this.cmdTimeout = init.cmdTimeout ?? 2000;
  }

  public async reset(): Promise<void> {
    await this.sendHciCommandWaitComplete({
      opcode: HciOpcode.build({
        ogf: HciOgf.ControlAndBasebandCommands,
        ocf: HciOcfControlAndBasebandCommands.Reset,
      }),
    });
  }

  public async readLocalSupportedFeatures(): Promise<BigInt> {
    const result = await this.sendHciCommandWaitComplete({
      opcode: HciOpcode.build({
        ogf: HciOgf.InformationParameters,
        ocf: HciOcfInformationParameters.ReadLocalSupportedFeatures,
      }),
    });
    if (result.returnParameters.length < (64/8)) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return result.returnParameters.readBigUInt64LE(0); // TODO: parse LMP features
  }

  public async readLocalVersionInformation(): Promise<Buffer> {
    const result = await this.sendHciCommandWaitComplete({
      opcode: HciOpcode.build({
        ogf: HciOgf.InformationParameters,
        ocf: HciOcfInformationParameters.ReadLocalVersionInformation,
      }),
    });
    return result.returnParameters; // TODO: parse version information
  }

  public async readBdAddr(): Promise<number> {
    const result = await this.sendHciCommandWaitComplete({
      opcode: HciOpcode.build({
        ogf: HciOgf.InformationParameters,
        ocf: HciOcfInformationParameters.ReadBdAddr,
      }),
    });
    if (result.returnParameters.length < 6) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return result.returnParameters.readUIntLE(0, 6);
  }

  public async readLocalSupportedCommands(): Promise<Buffer> {
    const result = await this.sendHciCommandWaitComplete({
      opcode: HciOpcode.build({
        ogf: HciOgf.InformationParameters,
        ocf: HciOcfInformationParameters.ReadLocalSupportedCommands,
      }),
    });
    // TODO: parse bitmask
    return result.returnParameters;
  }

  public async setEventMask(): Promise<void> {
    // TODO pass event mask as argument
    const mask = Buffer.from('90e8040200800020', 'hex');
    await this.sendHciCommandWaitComplete({
      opcode: HciOpcode.build({
        ogf: HciOgf.ControlAndBasebandCommands,
        ocf: HciOcfControlAndBasebandCommands.SetEventMask,
      }),
      payload: mask,
    });
  }

  public async setEventMaskPage2(): Promise<void> {
    // TODO pass event mask as argument
    const mask = Buffer.from('0000800000000000', 'hex');
    await this.sendHciCommandWaitComplete({
      opcode: HciOpcode.build({
        ogf: HciOgf.ControlAndBasebandCommands,
        ocf: HciOcfControlAndBasebandCommands.SetEventMaskPage2,
      }),
      payload: mask,
    });
  }

  public async leSetEventMask(): Promise<void> {
    // TODO pass event mask as argument
    const mask = Buffer.from('5f1e0a0000000000', 'hex');
    const ocf = HciOcfLeControllerCommands.SetEventMask;
    await this.sendLeCommandWaitComplete(ocf, mask);
  }

  public async leReadBufferSize() {
    const ocf = HciOcfLeControllerCommands.ReadBufferSizeV1;
    const result = await this.sendLeCommandWaitComplete(ocf);

    const returnParameters = result.returnParameters;
    if (returnParameters.length < 3) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return {
      leAclDataPacketLength:    returnParameters.readUInt16LE(0),
      totalNumLeAclDataPackets: returnParameters.readUInt8(2),
    };
  }

  public async leReadBufferSizeV2() {
    const ocf = HciOcfLeControllerCommands.ReadBufferSizeV2;
    const result = await this.sendLeCommandWaitComplete(ocf);

    const returnParameters = result.returnParameters;
    if (returnParameters.length < 6) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return {
      leAclDataPacketLength:    returnParameters.readUInt16LE(0),
      totalNumLeAclDataPackets: returnParameters.readUInt8(2),
      isoDataPacketLength:      returnParameters.readUInt16LE(3),
      totalNumIsoDataPackets:   returnParameters.readUInt8(5),
    };
  }

  public async leReadSupportedFeatures(): Promise<BigInt> {
    const ocf = HciOcfLeControllerCommands.ReadLocalSupportedFeatures;
    const result = await this.sendLeCommandWaitComplete(ocf);

    if (result.returnParameters.length < (64/8)) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    // TODO: parse bitmask
    return result.returnParameters.readBigUInt64LE(0);
  }

  public async leSetRandomAddress(randomAddress: number): Promise<void> {
    const payload = Buffer.allocUnsafe(6);
    payload.writeUIntLE(randomAddress, 0, 6);

    const ocf = HciOcfLeControllerCommands.SetRandomAddress;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leSetAdvertisingParameters(params: {
    advertisingIntervalMinMs: number,
    advertisingIntervalMaxMs: number,
    advertisingType: LeAdvertisingType,
    ownAddressType: LeOwnAddressType,
    peerAddressType: LePeerAddressType,
    peerAddress: number,
    advertisingChannelMap: LeAdvertisingChannelMap[],
    advertisingFilterPolicy: LeAdvertisingFilterPolicy,
  }): Promise<void> {

    const advertisingIntervalMin = Math.round(params.advertisingIntervalMinMs / 0.625);
    const advertisingIntervalMax = Math.round(params.advertisingIntervalMaxMs / 0.625);
    const advertisingChannelMap  = this.buildBitfield(params.advertisingChannelMap);

    const payload = Buffer.allocUnsafe(15);

    let o = 0;
    o = payload.writeUIntLE(advertisingIntervalMin,         o, 2);
    o = payload.writeUIntLE(advertisingIntervalMax,         o, 2);
    o = payload.writeUIntLE(params.advertisingType,         o, 1);
    o = payload.writeUIntLE(params.ownAddressType,          o, 1);
    o = payload.writeUIntLE(params.peerAddressType,         o, 1);
    o = payload.writeUIntLE(params.peerAddress,             o, 6);
    o = payload.writeUIntLE(advertisingChannelMap,          o, 1);
    o = payload.writeUIntLE(params.advertisingFilterPolicy, o, 1);

    const ocf = HciOcfLeControllerCommands.SetAdvertisingParameters;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leReadAdvertisingPhysicalChannelTxPower(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadAdvertisingPhysicalChannelTxPower;
    const result = await this.sendLeCommandWaitComplete(ocf);

    if (result.returnParameters.length < 1) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return result.returnParameters.readInt8(0);
  }

  public async leSetAdvertisingData(data: Buffer): Promise<void> {
    if (data.length > 31) {
      throw this.makeHciError(HciErrorCode.InvalidCommandParameter);
    }

    const payload = Buffer.alloc(1+31, 0);
    payload.writeUInt8(data.length, 0);
    data.copy(payload, 1);

    const ocf = HciOcfLeControllerCommands.SetAdvertisingData;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leSetScanResponseData(data: Buffer): Promise<void> {
    if (data.length > 31) {
      throw this.makeHciError(HciErrorCode.InvalidCommandParameter);
    }

    const payload = Buffer.alloc(1+31, 0);
    payload.writeUInt8(data.length, 0);
    data.copy(payload, 1);

    const ocf = HciOcfLeControllerCommands.SetScanResponseData;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leSetAdvertisingEnable(enable: boolean): Promise<void> {
    const payload = Buffer.allocUnsafe(1);
    payload.writeUInt8(enable ? 1 : 0);
    const ocf = HciOcfLeControllerCommands.SetAdvertisingEnable;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leSetScanParameters(params: {
    type: LeScanType,
    intervalMs: number,
    windowMs: number,
    ownAddressType: LeOwnAddressType,
    scanningFilterPolicy: LeScanningFilterPolicy,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(1+2+2+1+1);

    const interval = this.msToHciValue(params.intervalMs);
    const window   = this.msToHciValue(params.windowMs);

    let o = 0;
    o = payload.writeUIntLE(params.type,                 o, 1);
    o = payload.writeUIntLE(interval,                    o, 2);
    o = payload.writeUIntLE(window,                      o, 2);
    o = payload.writeUIntLE(params.ownAddressType,       o, 1);
    o = payload.writeUIntLE(params.scanningFilterPolicy, o, 1);

    const ocf = HciOcfLeControllerCommands.SetScanParameters;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leSetScanEnable(enable: boolean, filterDuplicates?: boolean): Promise<void> {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUInt8(enable           ? 1 : 0);
    payload.writeUInt8(filterDuplicates ? 1 : 0);
    const ocf = HciOcfLeControllerCommands.SetScanEnable;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leCreateConnection(params: {
    scanIntervalMs: number,
    scanWindowMs: number,
    initiatorFilterPolicy: number,
    peerAddressType: LePeerAddressType,
    peerAddress: number,
    ownAddressType: LeOwnAddressType,
    connectionIntervalMinMs: number,
    connectionIntervalMaxMs: number,
    connectionLatency: number,
    supervisionTimeoutMs: number,
    minCeLengthMs: number,
    maxCeLengthMs: number,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(2+2+1+1+6+1+2+2+2+2+2+2);

    const scanInterval       = this.msToHciValue(params.scanIntervalMs,          0.625);
    const scanWindow         = this.msToHciValue(params.scanWindowMs,            0.625);
    const connIntervalMin    = this.msToHciValue(params.connectionIntervalMinMs, 1.25);
    const connIntervalMax    = this.msToHciValue(params.connectionIntervalMaxMs, 1.25);
    const supervisionTimeout = this.msToHciValue(params.supervisionTimeoutMs,    10);
    const minConnEvtLength   = this.msToHciValue(params.minCeLengthMs,           0.625);
    const maxConnEvtLength   = this.msToHciValue(params.maxCeLengthMs,           0.625);

    let o = 0;
    o = payload.writeUIntLE(scanInterval,                 o, 2);
    o = payload.writeUIntLE(scanWindow,                   o, 2);
    o = payload.writeUIntLE(params.initiatorFilterPolicy, o, 1);
    o = payload.writeUIntLE(params.peerAddressType,       o, 1);
    o = payload.writeUIntLE(params.peerAddress,           o, 6);
    o = payload.writeUIntLE(params.ownAddressType,        o, 1);
    o = payload.writeUIntLE(connIntervalMin,              o, 2);
    o = payload.writeUIntLE(connIntervalMax,              o, 2);
    o = payload.writeUIntLE(params.connectionLatency,     o, 2);
    o = payload.writeUIntLE(supervisionTimeout,           o, 2);
    o = payload.writeUIntLE(minConnEvtLength,             o, 2);
    o = payload.writeUIntLE(maxConnEvtLength,             o, 2);

    const ocf = HciOcfLeControllerCommands.CreateConnection;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leCreateConnectionCancel(): Promise<void> {
    const ocf = HciOcfLeControllerCommands.CreateConnectionCancel;
    await this.sendLeCommandWaitComplete(ocf);
  }

  public async leReadWhiteListSize(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadWhiteListSize;
    const result = await this.sendLeCommandWaitComplete(ocf);

    if (result.returnParameters.length < 1) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return result.returnParameters.readUInt8(0);
  }

  public async leClearWhiteList(): Promise<void> {
    await this.sendLeCommandWaitComplete(HciOcfLeControllerCommands.ClearWhiteList);
  }

  public async leAddDeviceToWhiteList(addressType: LeWhiteListAddressType, address?: number): Promise<void> {
    const payload = Buffer.allocUnsafe(1+6);
    payload.writeUIntLE(addressType,  0, 1);
    payload.writeUIntLE(address ?? 0, 1, 6);
    const ocf = HciOcfLeControllerCommands.AddDeviceToWhiteList;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leRemoveDeviceFromWhiteList(addressType: LeWhiteListAddressType, address?: number): Promise<void> {
    const payload = Buffer.allocUnsafe(1+6);
    payload.writeUIntLE(addressType,  0, 1);
    payload.writeUIntLE(address ?? 0, 1, 6);
    const ocf = HciOcfLeControllerCommands.RemoveDeviceFromWhiteList;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leConnectionUpdate(params: {
    connectionHandle: number,
    connectionIntervalMinMs: number,
    connectionIntervalMaxMs: number,
    connectionLatency: number,
    supervisionTimeoutMs: number,
    minCeLengthMs: number,
    maxCeLengthMs: number,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(2+2+2+2+2+2+2);

    const connIntervalMin    = this.msToHciValue(params.connectionIntervalMinMs, 1.25);
    const connIntervalMax    = this.msToHciValue(params.connectionIntervalMaxMs, 1.25);
    const supervisionTimeout = this.msToHciValue(params.supervisionTimeoutMs,    10);
    const minConnEvtLength   = this.msToHciValue(params.minCeLengthMs,           0.625);
    const maxConnEvtLength   = this.msToHciValue(params.maxCeLengthMs,           0.625);

    let o = 0;
    o = payload.writeUIntLE(params.connectionLatency,     o, 2);
    o = payload.writeUIntLE(connIntervalMin,              o, 2);
    o = payload.writeUIntLE(connIntervalMax,              o, 2);
    o = payload.writeUIntLE(params.connectionLatency,     o, 2);
    o = payload.writeUIntLE(supervisionTimeout,           o, 2);
    o = payload.writeUIntLE(minConnEvtLength,             o, 2);
    o = payload.writeUIntLE(maxConnEvtLength,             o, 2);

    const ocf = HciOcfLeControllerCommands.ConnectionUpdate;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leSetHostChannelClassification(channelMap: number): Promise<void> {
    const payload = Buffer.allocUnsafe(5);
    payload.writeUIntLE(channelMap, 0, 5);
    const ocf = HciOcfLeControllerCommands.SetHostChannelClassification;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leReadChannelMap(connHandle: number): Promise<{ connHandle: number, channelMap: number }> {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUIntLE(connHandle, 0, 2);
    const ocf = HciOcfLeControllerCommands.ReadChannelMap;
    const result = await this.sendLeCommandWaitComplete(ocf, payload);

    const params = result.returnParameters;
    if (params.length < 7) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return {
      connHandle: params.readUIntLE(0, 2),
      channelMap: params.readUIntLE(2, 5),
    };
  }

  public async leReadRemoteFeatures(connHandle: number): Promise<void> {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUIntLE(connHandle, 0, 2);
    const ocf = HciOcfLeControllerCommands.ReadRemoteFeatures;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leEncrypt(key: Buffer, plaintextData: Buffer): Promise<Buffer> {
    if (key.length !== 16 || plaintextData.length !== 16) {
      throw this.makeHciError(HciErrorCode.InvalidCommandParameter);
    }

    const payload = Buffer.allocUnsafe(32);
    key.copy(payload, 0);
    plaintextData.copy(payload, 16);

    const ocf = HciOcfLeControllerCommands.Encrypt;
    const result = await this.sendLeCommandWaitComplete(ocf, payload);
    return result.returnParameters;
  }

  public async leRand(): Promise<Buffer> {
    const ocf = HciOcfLeControllerCommands.Rand;
    const result = await this.sendLeCommandWaitComplete(ocf);
    return result.returnParameters;
  }

  public async leEnableEncryption(params: {
    connHandle: number,
    randomNumber: Buffer,
    encryptedDiversifier: number,
    longTermKey: Buffer,
  }): Promise<void> {
    if (params.randomNumber.length !== 8 || params.longTermKey.length !== 16) {
      throw this.makeHciError(HciErrorCode.InvalidCommandParameter);
    }
    const payload = Buffer.allocUnsafe(2+8+2+16);

    let o = 0;
    o  = payload.writeUIntLE(params.connHandle, o, 2);
    o += params.randomNumber.copy(payload, o);
    o  = payload.writeUIntLE(params.encryptedDiversifier, o, 2);
    o += params.longTermKey.copy(payload, o);

    const ocf = HciOcfLeControllerCommands.EnableEncryption;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leLongTermKeyRequestReply(params: {
    connHandle: number,
    longTermKey: Buffer,
  }): Promise<number> {
    if (params.longTermKey.length !== 16) {
      throw this.makeHciError(HciErrorCode.InvalidCommandParameter);
    }
    const connHandle = params.connHandle;
    const payload = Buffer.allocUnsafe(2+16);

    let o = 0;
    o  = payload.writeUIntLE(connHandle, o, 2);
    o += params.longTermKey.copy(payload, o);

    const ocf = HciOcfLeControllerCommands.LongTermKeyRequestReply;
    const result = await this.sendLeConnCommandWaitComplete({ ocf, connHandle, payload });
    return result.returnParameters.readUInt16LE(0);
  }

  public async leLongTermKeyRequestNegativeReply(connHandle: number): Promise<number> {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUIntLE(connHandle, 0, 2);

    const ocf = HciOcfLeControllerCommands.LongTermKeyRequestNegativeReply;
    const result = await this.sendLeConnCommandWaitComplete({ ocf, connHandle, payload });
    return result.returnParameters.readUInt16LE(0);
  }

  public async leReadSupportedStates(): Promise<LeSupportedStates> {
    const ocf = HciOcfLeControllerCommands.ReadSupportedStates;
    const result = await this.sendLeCommandWaitComplete(ocf);

    const params = result.returnParameters;
    if (params.length < (64/8)) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    const bitmask = params.readBigUInt64LE(0);
    return LeSupportedStates.fromBitmask(bitmask);
  }

  public async leReceiverTestV1(params: { rxChannelMhz: number }): Promise<void> {
    const rxChannel = this.channelFrequencyToHciValue(params.rxChannelMhz);

    const payload = Buffer.allocUnsafe(1);
    payload.writeUIntLE(rxChannel, 0, 1);

    const ocf = HciOcfLeControllerCommands.ReceiverTestV1;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  private channelFrequencyToHciValue(rxChannelMhz: number): number {
    return (rxChannelMhz - 2402) / 2;
  }

  public async leReceiverTestV2(params: {
    rxChannelMhz: number,
    phy: LePhy,
    modulationIndex: LeModulationIndex,
  }): Promise<void> {
    const rxChannel = this.channelFrequencyToHciValue(params.rxChannelMhz);

    const payload = Buffer.allocUnsafe(1+1+1);

    let o = 0;
    o = payload.writeUIntLE(rxChannel,              o, 1);
    o = payload.writeUIntLE(params.phy,             o, 1);
    o = payload.writeUIntLE(params.modulationIndex, o, 1);

    const ocf = HciOcfLeControllerCommands.ReceiverTestV2;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leReceiverTestV3(params: {
    rxChannelMhz: number,
    phy: LePhy,
    modulationIndex: LeModulationIndex,
    expectedCteLength: number,
    expectedCteType: LeCteType,
    slotDurations: 1|2,
    antennaIds: number[],
  }): Promise<void> {
    const rxChannel = this.channelFrequencyToHciValue(params.rxChannelMhz);

    const payload = Buffer.allocUnsafe(1+1+1+1+1+1+1+params.antennaIds.length);

    let o = 0;
    o = payload.writeUIntLE(rxChannel,                o, 1);
    o = payload.writeUIntLE(params.phy,               o, 1);
    o = payload.writeUIntLE(params.modulationIndex,   o, 1);
    o = payload.writeUIntLE(params.expectedCteLength, o, 1);
    o = payload.writeUIntLE(params.expectedCteType,   o, 1);
    o = payload.writeUIntLE(params.slotDurations,     o, 1);
    o = payload.writeUIntLE(params.antennaIds.length, o, 1);

    for (const antennaId of params.antennaIds) {
      o = payload.writeUIntLE(antennaId, o, 1);
    }

    const ocf = HciOcfLeControllerCommands.ReceiverTestV3;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leTransmitterTestV1(params: {
    txChannelMhz: number,
    testDataLength: number,
    packetPayload: LeTxTestPayload,
  }): Promise<void> {
    const txChannel = this.channelFrequencyToHciValue(params.txChannelMhz);

    const payload = Buffer.allocUnsafe(1+1+1);

    let o = 0;
    o = payload.writeUIntLE(txChannel,              o, 1);
    o = payload.writeUIntLE(params.testDataLength,  o, 1);
    o = payload.writeUIntLE(params.packetPayload,   o, 1);

    const ocf = HciOcfLeControllerCommands.TransmitterTestV1;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leTransmitterTestV2(params: {
    txChannelMhz: number,
    testDataLength: number,
    packetPayload: LeTxTestPayload,
    phy: LeTxPhy,
  }): Promise<void> {
    const txChannel = this.channelFrequencyToHciValue(params.txChannelMhz);

    const payload = Buffer.allocUnsafe(1+1+1+1);

    let o = 0;
    o = payload.writeUIntLE(txChannel,              o, 1);
    o = payload.writeUIntLE(params.testDataLength,  o, 1);
    o = payload.writeUIntLE(params.packetPayload,   o, 1);
    o = payload.writeUIntLE(params.phy,             o, 1);

    const ocf = HciOcfLeControllerCommands.TransmitterTestV2;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leTransmitterTestV3(params: {
    txChannelMhz: number,
    testDataLength: number,
    packetPayload: LeTxTestPayload,
    phy: LeTxPhy,
    cteLength: number,
    cteType: LeCteType,
    antennaIds: number[],
  }): Promise<void> {
    const txChannel = this.channelFrequencyToHciValue(params.txChannelMhz);

    const payload = Buffer.allocUnsafe(1+1+1+1+1+1+1+params.antennaIds.length);

    let o = 0;
    o = payload.writeUIntLE(txChannel,                o, 1);
    o = payload.writeUIntLE(params.testDataLength,    o, 1);
    o = payload.writeUIntLE(params.packetPayload,     o, 1);
    o = payload.writeUIntLE(params.phy,               o, 1);
    o = payload.writeUIntLE(params.cteLength,         o, 1);
    o = payload.writeUIntLE(params.cteType,           o, 1);
    o = payload.writeUIntLE(params.antennaIds.length, o, 1);

    for (const antennaId of params.antennaIds) {
      o = payload.writeUIntLE(antennaId, o, 1);
    }

    const ocf = HciOcfLeControllerCommands.TransmitterTestV3;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leTransmitterTestV4(params: {
    txChannelMhz: number,
    testDataLength: number,
    packetPayload: LeTxTestPayload,
    phy: LeTxPhy,
    cteLength: number,
    cteType: LeCteType,
    antennaIds: number[],
    transmitPowerLevel: number|LeMinTransmitPowerLevel|LeMaxTransmitPowerLevel,
  }): Promise<void> {
    const txChannel = this.channelFrequencyToHciValue(params.txChannelMhz);

    const payload = Buffer.allocUnsafe(1+1+1+1+1+1+1+params.antennaIds.length+1);

    let o = 0;
    o = payload.writeUIntLE(txChannel,                o, 1);
    o = payload.writeUIntLE(params.testDataLength,    o, 1);
    o = payload.writeUIntLE(params.packetPayload,     o, 1);
    o = payload.writeUIntLE(params.phy,               o, 1);
    o = payload.writeUIntLE(params.cteLength,         o, 1);
    o = payload.writeUIntLE(params.cteType,           o, 1);
    o = payload.writeUIntLE(params.antennaIds.length, o, 1);

    for (const antennaId of params.antennaIds) {
      o = payload.writeUIntLE(antennaId, o, 1);
    }

    o = payload.writeIntLE(params.transmitPowerLevel, o, 1);

    const ocf = HciOcfLeControllerCommands.TransmitterTestV4;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leTestEnd(): Promise<number> {
    const result = await this.sendLeCommandWaitComplete(HciOcfLeControllerCommands.TestEnd);
    if (result.returnParameters.length < 2) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return result.returnParameters.readUInt16LE(0);
  }

  public async leRemoteConnectionParameterRequestReply(params: {
    connHandle: number,
    intervalMinMs: number, // 7.5ms - 4000ms
    intervalMaxMs: number, // 7.5ms - 4000ms
    latency: number,
    timeoutMs: number,
    minCeLengthMs: number,
    maxCeLengthMs: number,
  }): Promise<void> {
    const intervalMin   = this.msToHciValue(params.intervalMinMs, 1.25);
    const intervalMax   = this.msToHciValue(params.intervalMaxMs, 1.25);
    const timeout       = this.msToHciValue(params.timeoutMs,     10);
    const minCeLength   = this.msToHciValue(params.minCeLengthMs, 0.625);
    const maxCeLength   = this.msToHciValue(params.maxCeLengthMs, 0.625);

    const payload = Buffer.allocUnsafe(2+2+2+2+2+2);

    let o = 0;
    o = payload.writeUIntLE(params.connHandle,  o, 2);
    o = payload.writeUIntLE(intervalMin,        o, 2);
    o = payload.writeUIntLE(intervalMax,        o, 2);
    o = payload.writeUIntLE(timeout,            o, 2);
    o = payload.writeUIntLE(minCeLength,        o, 2);
    o = payload.writeUIntLE(maxCeLength,        o, 2);

    const connHandle = params.connHandle;
    const ocf = HciOcfLeControllerCommands.RemoteConnectionParameterRequestReply;
    await this.sendLeConnCommandWaitComplete({ ocf, connHandle, payload });
  }

  public async leRemoteConnectionParameterRequestNegativeReply(params: {
    connHandle: number,
    reason: HciErrorCode,
  }): Promise<void> {
    const connHandle = params.connHandle;
    const payload = Buffer.allocUnsafe(2+1);

    let o = 0;
    o = payload.writeUIntLE(connHandle,     o, 2);
    o = payload.writeUIntLE(params.reason,  o, 1);

    const ocf = HciOcfLeControllerCommands.RemoteConnectionParameterRequestNegativeReply;
    await this.sendLeConnCommandWaitComplete({ ocf, connHandle, payload });
  }

  public async leSetDataLength(params: {
    connHandle: number,
    txOctets: number,
    txTime: number,
  }): Promise<void> {
    const connHandle = params.connHandle;
    const payload = Buffer.allocUnsafe(2+2+2);

    let o = 0;
    o = payload.writeUIntLE(connHandle,       o, 2);
    o = payload.writeUIntLE(params.txOctets,  o, 2);
    o = payload.writeUIntLE(params.txTime,    o, 2);

    const ocf = HciOcfLeControllerCommands.SetDataLength;
    await this.sendLeConnCommandWaitComplete({ ocf, connHandle, payload });
  }

  public async leReadSuggestedDefaultDataLength(): Promise<{
    suggestedMaxTxOctets: number,
    suggestedMaxTxTime: number,
  }> {
    const ocf = HciOcfLeControllerCommands.ReadSuggestedDefaultDataLength;
    const result = await this.sendLeCommandWaitComplete(ocf);

    const params = result.returnParameters;
    if (params.length < 4) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return {
      suggestedMaxTxOctets: params.readUInt16LE(0),
      suggestedMaxTxTime:   params.readUInt16LE(2)
    };
  }

  public async leWriteSuggestedDefaultDataLength(params: {
    suggestedMaxTxOctets: number,
    suggestedMaxTxTime: number,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(4);
    payload.writeUInt16LE(params.suggestedMaxTxOctets, 0);
    payload.writeUInt16LE(params.suggestedMaxTxTime,   2);
    const ocf = HciOcfLeControllerCommands.WriteSuggestedDefaultDataLength;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leReadLocalP256PublicKey(): Promise<void> {
    const ocf = HciOcfLeControllerCommands.ReadLocalP256PublicKey;
    await this.sendLeCommandWaitStatus({ ocf });
  }

  public async leGenerateDhKeyV1(params: {
    publicKey: Buffer,
  }): Promise<void> {
    if (params.publicKey.length !== 64) {
      throw this.makeHciError(HciErrorCode.InvalidCommandParameter);
    }
    const payload = Buffer.allocUnsafe(64);
    params.publicKey.copy(payload, 0);

    const ocf = HciOcfLeControllerCommands.GenerateDhKeyV1;
    await this.sendLeCommandWaitStatus({ ocf, payload });
  }

  public async leGenerateDhKeyV2(params: {
    publicKey: Buffer,
    keyType: number,
  }): Promise<void> {
    if (params.publicKey.length !== 64) {
      throw this.makeHciError(HciErrorCode.InvalidCommandParameter);
    }
    const payload = Buffer.allocUnsafe(65);
    params.publicKey.copy(payload, 0);
    payload.writeUInt8(params.keyType, 64);

    const ocf = HciOcfLeControllerCommands.GenerateDhKeyV2;
    await this.sendLeCommandWaitStatus({ ocf, payload });
  }

  public async leClearResolvingList(): Promise<void> {
    await this.sendLeCommandWaitComplete(HciOcfLeControllerCommands.ClearResolvingList);
  }

  public async leReadResolvingListSize(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadResolvingListSize;
    const result = await this.sendLeCommandWaitComplete(ocf);
    if (result.returnParameters.length < 1) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return result.returnParameters.readUInt8(0);
  }

  public async leReadMaximumDataLength(): Promise<{
    supportedMaxTxOctets: number, supportedMaxTxTime: number,
    supportedMaxRxOctets: number, supportedMaxRxTime: number,
  }> {
    const ocf = HciOcfLeControllerCommands.ReadMaximumDataLength;
    const result = await this.sendLeCommandWaitComplete(ocf);
    const params = result.returnParameters;

    if (params.length < 8) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return {
      supportedMaxTxOctets: params.readUInt16LE(0),
      supportedMaxTxTime:   params.readUInt16LE(2),
      supportedMaxRxOctets: params.readUInt16LE(4),
      supportedMaxRxTime:   params.readUInt16LE(6),
    };
  }

  public async leReadPhy(connectionHandle: number): Promise<{
    connectionHandle: number,
    txPhy: LePhy,
    rxPhy: LePhy,
  }> {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUInt16LE(connectionHandle, 0);

    const ocf = HciOcfLeControllerCommands.ReadPhy;
    const result = await this.sendLeCommandWaitComplete(ocf, payload);
    const params = result.returnParameters;

    if (params.length < 4) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return {
      connectionHandle: params.readUInt16LE(0),
      txPhy:            params.readUInt8(2),
      rxPhy:            params.readUInt8(3),
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
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leSetAdvertisingSetRandomAddress(params: {
    advertisingHandle: number,
    advertisingRandomAddress: number,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(7);

    let o = 0;
    o = payload.writeUIntLE(params.advertisingHandle,        o, 1);
    o = payload.writeUIntLE(params.advertisingRandomAddress, o, 6);

    const ocf = HciOcfLeControllerCommands.SetAdvertisingSetRandomAddress;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leSetExtendedAdvertisingParameters(params: {
    advertisingHandle: number,
    advertisingEventProperties: LeAdvertisingEventProperties[],
    primaryAdvertisingIntervalMinMs: number,
    primaryAdvertisingIntervalMaxMs: number,
    primaryAdvertisingChannelMap: LeAdvertisingChannelMap[],
    ownAddressType: LeOwnAddressType,
    peerAddressType: LePeerAddressType,
    peerAddress: number,
    advertisingFilterPolicy: LeAdvertisingFilterPolicy,
    advertisingTxPower?: number,
    primaryAdvertisingPhy: LePrimaryAdvertisingPhy,
    secondaryAdvertisingMaxSkip: number,
    secondaryAdvertisingPhy: LeSecondaryAdvertisingPhy,
    advertisingSid: number,
    scanRequestNotificationEnable: boolean,
  }): Promise<number> {

    const advertisingEventProperties    = this.buildBitfield(params.advertisingEventProperties);
    const primaryAdvertisingIntervalMin = Math.round(params.primaryAdvertisingIntervalMinMs / 0.625);
    const primaryAdvertisingIntervalMax = Math.round(params.primaryAdvertisingIntervalMaxMs / 0.625);
    const primaryAdvertisingChannelMap  = this.buildBitfield(params.primaryAdvertisingChannelMap);
    const advertisingTxPower            = params.advertisingTxPower ?? 0x7F; // 0x7F - Host has no preference
    const scanRequestNotificationEnable = params.scanRequestNotificationEnable ? 1 : 0;

    const payload = Buffer.allocUnsafe(25);

    let o = 0;
    o = payload.writeUIntLE(params.advertisingHandle,             o, 1);
    o = payload.writeUIntLE(advertisingEventProperties,           o, 2);
    o = payload.writeUIntLE(primaryAdvertisingIntervalMin,        o, 3);
    o = payload.writeUIntLE(primaryAdvertisingIntervalMax,        o, 3);
    o = payload.writeUIntLE(primaryAdvertisingChannelMap,         o, 1);
    o = payload.writeUIntLE(params.ownAddressType,                o, 1);
    o = payload.writeUIntLE(params.peerAddressType,               o, 1);
    o = payload.writeUIntLE(params.peerAddress,                   o, 6);
    o = payload.writeUIntLE(params.advertisingFilterPolicy,       o, 1);
    o = payload.writeIntLE (advertisingTxPower,                   o, 1);
    o = payload.writeUIntLE(params.primaryAdvertisingPhy,         o, 1);
    o = payload.writeUIntLE(params.secondaryAdvertisingMaxSkip,   o, 1);
    o = payload.writeUIntLE(params.secondaryAdvertisingPhy,       o, 1);
    o = payload.writeUIntLE(params.advertisingSid,                o, 1);
    o = payload.writeUIntLE(scanRequestNotificationEnable,        o, 1);

    const ocf = HciOcfLeControllerCommands.SetExtendedAdvertisingParameters;
    const result = await this.sendLeCommandWaitComplete(ocf, payload);

    if (result.returnParameters.length < 1) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }

    const selectedTxPower = result.returnParameters.readInt8(0);
    return selectedTxPower;
  }

  public async leSetExtendedAdvertisingData(params: {
    advertisingHandle: number,
    operation: LeAdvertisingDataOperation,
    fragment: boolean,
    data: Buffer,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(4 + params.data.length);

    let o = 0;
    o = payload.writeUIntLE(params.advertisingHandle,  o, 1);
    o = payload.writeUIntLE(params.operation,          o, 1);
    o = payload.writeUIntLE(params.fragment ? 0 : 1,   o, 1);
    o = payload.writeUIntLE(params.data.length,        o, 1);
    params.data.copy(payload, o);

    const ocf = HciOcfLeControllerCommands.SetExtendedAdvertisingData;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leSetExtendedScanResponseData(params: {
    advertisingHandle: number,
    operation: LeScanResponseDataOperation,
    fragment: boolean,
    data: Buffer,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(4 + params.data.length);

    let o = 0;
    o = payload.writeUIntLE(params.advertisingHandle,  o, 1);
    o = payload.writeUIntLE(params.operation,          o, 1);
    o = payload.writeUIntLE(params.fragment ? 0 : 1,   o, 1);
    o = payload.writeUIntLE(params.data.length,        o, 1);
    params.data.copy(payload, o);

    const ocf = HciOcfLeControllerCommands.SetExtendedScanResponseData;
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  public async leReadNumberOfSupportedAdvertisingSets(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadNumberOfSupportedAdvertisingSets;
    const result = await this.sendLeCommandWaitComplete(ocf);
    if (result.returnParameters.length < 1) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return result.returnParameters.readUInt8(0);
  }

  public async leSetExtendedScanParameters(params: {
    ownAddressType: LeOwnAddressType,
    scanningFilterPolicy: LeScanningFilterPolicy,
    scanningPhy: {
      Phy1M?:    { type: LeScanType, intervalMs: number, windowMs: number },
      PhyCoded?: { type: LeScanType, intervalMs: number, windowMs: number },
    },
  }): Promise<void> {
    const phys = { count: 0, bitmask: 0 };

    if (params.scanningPhy.Phy1M) {
      phys.count++;
      phys.bitmask |= 1 << LeScanningPhy.Phy1M;
    }
    if (params.scanningPhy.PhyCoded) {
      phys.count++;
      phys.bitmask |= 1 << LeScanningPhy.PhyCoded;
    }

    if (phys.count === 0) {
      throw this.makeHciError(HciErrorCode.InvalidCommandParameter);
    }

    const payload = Buffer.allocUnsafe(3 + phys.count * (1+2+2));

    let o = 0;
    o = payload.writeUIntLE(params.ownAddressType,       o, 1);
    o = payload.writeUIntLE(params.scanningFilterPolicy, o, 1);
    o = payload.writeUIntLE(phys.bitmask,                o, 1);

    if (params.scanningPhy.Phy1M) {
      o = payload.writeUIntLE(params.scanningPhy.Phy1M.type, o, 1);
    }
    if (params.scanningPhy.PhyCoded) {
      o = payload.writeUIntLE(params.scanningPhy.PhyCoded.type, o, 1);
    }
    if (params.scanningPhy.Phy1M) {
      const interval = this.msToHciValue(params.scanningPhy.Phy1M.intervalMs);
      o = payload.writeUIntLE(interval, o, 2);
    }
    if (params.scanningPhy.PhyCoded) {
      const interval = this.msToHciValue(params.scanningPhy.PhyCoded.intervalMs);
      o = payload.writeUIntLE(interval, o, 2);
    }
    if (params.scanningPhy.Phy1M) {
      const window = this.msToHciValue(params.scanningPhy.Phy1M.windowMs);
      o = payload.writeUIntLE(window, o, 2);
    }
    if (params.scanningPhy.PhyCoded) {
      const window = this.msToHciValue(params.scanningPhy.PhyCoded.windowMs);
      o = payload.writeUIntLE(window, o, 2);
    }

    const ocf = HciOcfLeControllerCommands.SetExtendedScanParameters;
    await this.sendLeCommandWaitComplete(ocf, payload);
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
    await this.sendLeCommandWaitComplete(ocf, payload);
  }

  private async sendLeCommandWaitComplete(ocf: HciOcfLeControllerCommands, payload?: Buffer): Promise<HciEvtCmdComplete> {
    return await this.sendHciCommandWaitComplete({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands, ocf,
      }),
      payload,
    });
  }

  private async sendLeCommandWaitStatus(params: {
    ocf: HciOcfLeControllerCommands,
    payload?: Buffer
  }): Promise<HciEvtCmdStatus> {
    return await this.sendHciCommandWaitStatus({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands, ocf: params.ocf,
      }),
      payload: params.payload,
    });
  }

  private async sendLeConnCommandWaitComplete(params: {
    ocf: HciOcfLeControllerCommands,
    connHandle: number,
    payload?: Buffer
  }): Promise<HciEvtCmdComplete> {
    return await this.sendHciCommandWaitComplete({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands, ocf: params.ocf,
      }),
      connHandle: params.connHandle,
      payload: params.payload,
    });
  }

  private hciValueToMs(val: number, factor: number = 0.625): number {
    return val * factor;
  }
  private msToHciValue(ms: number, factor: number = 0.625): number {
    return Math.round(ms / factor);
  }

  private buildBitfield(bits: number[]): number {
    let bitfield = 0;
    for (const bit of bits) {
      bitfield |= 1 << bit;
    }
    return bitfield;
  }

  private async sendHciCommandWaitStatus(cmd: HciCommand, connHandle?: number): Promise<HciEvtCmdStatus> {
    return new Promise<HciEvtCmdComplete|HciEvtCmdStatus>((resolve, reject) => {
      if (this.onCmdComplete !== null || this.onCmdStatus !== null) {
        return reject(this.makeError(HciParserError.Busy));
      }
      const complete = (err?: Error, evt?: HciEvtCmdComplete|HciEvtCmdStatus) => {
        clearTimeout(timeoutId);
        this.onCmdComplete = null;
        this.onCmdStatus = null;
        err ? reject(err) : resolve(evt!);
      };
      const timeoutId = setTimeout(
        () => complete(this.makeError(HciParserError.Timeout)), this.cmdTimeout
      );
      this.onCmdStatus = (evt: HciEvtCmdStatus) => {
        if (cmd.opcode !== evt.opcode) {
          return;
        }
        if (evt.status !== HciErrorCode.Success) {
          complete(this.makeHciError(evt.status));
        } else {
          complete(undefined, evt);
        }
      };
      this.sendRaw(HciPacketType.HciCommand, this.buildHciCommandBuffer(cmd));
    });
  }

  private async sendHciCommandWaitComplete(cmd: HciCommand, connHandle?: number): Promise<HciEvtCmdComplete> {
    return new Promise<HciEvtCmdComplete>((resolve, reject) => {
      if (this.onCmdComplete !== null) {
        return reject(this.makeError(HciParserError.Busy));
      }
      const complete = (err?: Error, evt?: HciEvtCmdComplete) => {
        clearTimeout(timeoutId);
        this.onCmdComplete = null;
        this.onCmdStatus = null;
        err ? reject(err) : resolve(evt!);
      };
      const timeoutId = setTimeout(
        () => complete(this.makeError(HciParserError.Timeout)), this.cmdTimeout
      );
      this.onCmdStatus = (evt: HciEvtCmdStatus) => {
        if (cmd.opcode !== evt.opcode) {
          return;
        }
        if (evt.status !== HciErrorCode.Success) {
          complete(this.makeHciError(evt.status));
        } else {
          // TODO: this command should return complete|status
          // complete(undefined, evt);
        }
      };
      this.onCmdComplete = (evt: HciEvtCmdComplete) => {
        if (cmd.opcode !== evt.opcode) {
          return;
        }
        if (connHandle === undefined) {
          if (evt.status !== HciErrorCode.Success) {
            complete(this.makeHciError(evt.status));
          } else {
            complete(undefined, evt);
          }
        } else {
          if (evt.returnParameters.length < 2) {
            debug(`Cannot parse connection command complete event`);
            return; // NOTE: can't tell which connection
          }
          if (connHandle !== evt.returnParameters.readUInt16LE(0)) {
            return;
          }
          if (evt.status !== HciErrorCode.Success) {
            complete(this.makeHciError(evt.status));
          } else {
            complete(undefined, evt);
          }
        }
      };
      this.sendRaw(HciPacketType.HciCommand, this.buildHciCommandBuffer(cmd));
    });
  }

  private makeHciError(code: HciErrorCode): HciError {
    return new HciError(code);
  }

  private makeError(code: HciParserError): Error {
    if (code === HciParserError.InvalidPayloadSize) {
      return new Error(`Cannot parse payload, invalid size`);
    }
    if (code === HciParserError.Busy) {
      return new Error(`Busy, command in progress.`)
    }
    if (code === HciParserError.Timeout) {
      return new Error(`Command timeout`);
    }
    return new Error(`Unexpected error`);
  }

  private buildHciCommandBuffer(cmd: HciCommand): Buffer {
    const payloadLength = cmd.payload?.length ?? 0;
    const buffer = Buffer.allocUnsafe(3 + payloadLength);

    let o = 0;
    o = buffer.writeUIntLE(cmd.opcode,            o, 2);
    o = buffer.writeUIntLE(payloadLength,         o, 1);

    if (cmd.payload && payloadLength > 0) {
      cmd.payload.copy(buffer, 3);
    }

    return buffer;
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
      this.emit('parser-error', `(evt) invalid payload size: ${payloadLength}/${payload.length}`);
      return;
    }

    switch (eventCode) {
      case HciEvent.CommandComplete:
        if (payload.length < 4) {
          this.emit('parser-error', `(evt-cmd_complete) invalid payload size: ${payload.length}`);
          return;
        }
        const complete: HciEvtCmdComplete = {
          numHciPackets: payload[0],
          opcode: payload.readUInt16LE(1),
          status: payload[3],
          returnParameters: payload.slice(4),
        };
        if (this.onCmdComplete) {
          this.onCmdComplete(complete);
        }
        break;
      case HciEvent.CommandStatus:
        if (payload.length < 4) {
          this.emit('parser-error', `(evt-cmd_status) invalid payload size: ${payload.length}`);
          return;
        }
        const status: HciEvtCmdStatus = {
          status: payload[0],
          numHciPackets: payload[1],
          opcode: payload.readUInt16LE(2),
        };
        if (this.onCmdStatus) {
          this.onCmdStatus(status);
        }
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

  private parseLeExtAdvertReport(data: Buffer) {
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
      periodicAdvertisingInterval: number;
      directAddressType: number;
      directAddress: number;
      dataLength: number;
      data: Buffer;
    }>[] = [];

    for (let i = 0; i < numReports; i++) {
      reportsRaw.push({});
    }

    let o = 1;

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
      reportsRaw[i].periodicAdvertisingInterval = data.readUIntLE(o, 2);
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
      reportsRaw[i].data = data.slice(o, o + dataLength);
      o += dataLength;
    }

    console.log(reportsRaw);

    return reportsRaw.map((reportRaw) => {
      return reportRaw
    });
  }
}
