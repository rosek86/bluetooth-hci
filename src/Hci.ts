
import { EventEmitter } from "events";
import Debug from "debug";

import HciError from './HciError';
import { HciErrorCode } from './HciError';
import { HciOgf, HciOcfInformationParameters, HciOcfControlAndBasebandCommands, HciOcfLeControllerCommands } from './HciOgfOcf'
import { LeAdvertisingChannelMap, LeAdvertisingEventProperties, LeAdvertisingFilterPolicy, LeOwnAddressType, LePeerAddressType, LePhy, LePrimaryAdvertisingPhy, LeSecondaryAdvertisingPhy, LeSupportedStates } from './HciLe';

const debug = Debug('nble-hci');

interface HciInit {
  cmdTimeout?: number;
  send: (data: Buffer) => void;
  setEventHandler: (_: (data: Buffer) => void) => void;
}

interface HciCommand {
  opcode: number;
  params?: Buffer;
}

enum HciEventCode {
  HCI_EVT_CMD_COMPLETE = 0x0e
}

interface HciEvtCmdComplete {
  numHciPackets: number;
  opcode: number;
  status: number;
  returnParameters: Buffer;
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
}

export default class Hci extends EventEmitter {
  private sendRaw: (data: Buffer) => void;
  private cmdTimeout: number;

  private cmdOpcode = 0;
  private onCmdComplete: ((_: HciEvtCmdComplete) => void) | null = null;

  public constructor(init: HciInit) {
    super();

    this.sendRaw = init.send;
    this.cmdTimeout = init.cmdTimeout ?? 2000;
    init.setEventHandler(this.onData.bind(this));
  }

  public async reset(): Promise<void> {
    await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.ControlAndBasebandCommands,
        ocf: HciOcfControlAndBasebandCommands.Reset,
      }),
    });
  }

  public async readLocalSupportedFeatures(): Promise<BigInt> {
    const result = await this.send({
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
    const result = await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.InformationParameters,
        ocf: HciOcfInformationParameters.ReadLocalVersionInformation,
      }),
    });
    return result.returnParameters; // TODO: parse version information
  }

  public async readBdAddr(): Promise<number> {
    const result = await this.send({
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

  // TODO annotate return param
  public async leReadBufferSize() {
    const result = await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands,
        ocf: HciOcfLeControllerCommands.ReadBufferSizeV1,
      }),
    });
    if (result.returnParameters.length < 3) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return {
      LeAclDataPacketLength: result.returnParameters.readUInt16LE(0),
      TotalNumLeAclDataPackets: result.returnParameters.readUInt8(2),
    };
  }

  public async leReadSupportedFeatures(): Promise<BigInt> {
    const result = await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands,
        ocf: HciOcfLeControllerCommands.ReadLocalSupportedFeatures,
      }),
    });
    if (result.returnParameters.length < (64/8)) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    // TODO: parse bitmask
    return result.returnParameters.readBigUInt64LE(0);
  }

  public async leReadSupportedStates(): Promise<LeSupportedStates> {
    const result = await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands,
        ocf: HciOcfLeControllerCommands.ReadSupportedStates,
      }),
    });
    if (result.returnParameters.length < (64/8)) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    const bitmask = result.returnParameters.readBigUInt64LE(0);
    return LeSupportedStates.fromBitmask(bitmask);
  }

  public async readLocalSupportedCommands(): Promise<Buffer> {
    const result = await this.send({
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
    await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.ControlAndBasebandCommands,
        ocf: HciOcfControlAndBasebandCommands.SetEventMask,
      }),
      params: mask
    });
  }

  public async setEventMaskPage2(): Promise<void> {
    // TODO pass event mask as argument
    const mask = Buffer.from('0000800000000000', 'hex');
    await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.ControlAndBasebandCommands,
        ocf: HciOcfControlAndBasebandCommands.SetEventMaskPage2,
      }),
      params: mask
    });
  }

  public async leSetEventMask(): Promise<void> {
    // TODO pass event mask as argument
    const mask = Buffer.from('5f1e0a0000000000', 'hex');
    await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands,
        ocf: HciOcfLeControllerCommands.SetEventMask,
      }),
      params: mask,
    });
  }

  public async leReadWhiteListSize(): Promise<number> {
    const result = await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands,
        ocf: HciOcfLeControllerCommands.ReadWhiteListSize,
      }),
    });
    if (result.returnParameters.length < 1) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return result.returnParameters.readUInt8(0);
  }

  public async leClearWhiteList(): Promise<void> {
    await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands,
        ocf: HciOcfLeControllerCommands.ClearWhiteList,
      }),
    });
  }

  public async leReadResolvingListSize(): Promise<number> {
    const result = await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands,
        ocf: HciOcfLeControllerCommands.ReadResolvingListSize,
      }),
    });
    if (result.returnParameters.length < 1) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return result.returnParameters.readUInt8(0);
  }

  public async leClearResolvingList(): Promise<void> {
    await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands,
        ocf: HciOcfLeControllerCommands.ClearResolvingList,
      }),
    });
  }

  public async leReadMaximumDataLength(): Promise<{
    supportedMaxTxOctets: number, supportedMaxTxTime: number,
    supportedMaxRxOctets: number, supportedMaxRxTime: number,
  }> {
    const result = await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands,
        ocf: HciOcfLeControllerCommands.ReadMaximumDataLength,
      }),
    });
    if (result.returnParameters.length < 8) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    const params = result.returnParameters;
    return {
      supportedMaxTxOctets: params.readUInt16LE(0),
      supportedMaxTxTime:   params.readUInt16LE(2),
      supportedMaxRxOctets: params.readUInt16LE(4),
      supportedMaxRxTime:   params.readUInt16LE(6),
    };
  }

  public async leReadSuggestedDefaultDataLength(): Promise<{
    suggestedMaxTxOctets: number, suggestedMaxTxTime: number,
  }> {
    const result = await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands,
        ocf: HciOcfLeControllerCommands.ReadSuggestedDefaultDataLength,
      }),
    });
    if (result.returnParameters.length < 4) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    const params = result.returnParameters;
    return {
      suggestedMaxTxOctets: params.readUInt16LE(0),
      suggestedMaxTxTime:   params.readUInt16LE(2)
    };
  }

  public async leReadNumberOfSupportedAdvertisingSets(): Promise<number> {
    const result = await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands,
        ocf: HciOcfLeControllerCommands.ReadNumberOfSupportedAdvertisingSets,
      }),
    });
    if (result.returnParameters.length < 1) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }
    return result.returnParameters.readUInt8(0);
  }

  public async leWriteSuggestedDefaultDataLength(params: {
    suggestedMaxTxOctets: number,
    suggestedMaxTxTime: number,
  }): Promise<void> {
    const payload = Buffer.alloc(4);
    payload.writeUInt16LE(params.suggestedMaxTxOctets, 0);
    payload.writeUInt16LE(params.suggestedMaxTxTime, 2);
    await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands,
        ocf: HciOcfLeControllerCommands.WriteSuggestedDefaultDataLength,
      }),
      params: payload,
    });
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

    const payload = Buffer.alloc(3);
    payload.writeUInt8(allPhys, 0);
    payload.writeUInt8(txPhys,  1);
    payload.writeUInt8(rxPhys,  2);

    await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands,
        ocf: HciOcfLeControllerCommands.SetDefaultPhy,
      }),
      params: payload,
    });
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

    let o = 0, s = 0;
    const payload = Buffer.alloc(25);
    s = 1; payload.writeUIntLE(params.advertisingHandle,             o, s); o += s;
    s = 2; payload.writeUIntLE(advertisingEventProperties,           o, s); o += s;
    s = 3; payload.writeUIntLE(primaryAdvertisingIntervalMin,        o, s); o += s;
    s = 3; payload.writeUIntLE(primaryAdvertisingIntervalMax,        o, s); o += s;
    s = 1; payload.writeUIntLE(primaryAdvertisingChannelMap,         o, s); o += s;
    s = 1; payload.writeUIntLE(params.ownAddressType,                o, s); o += s;
    s = 1; payload.writeUIntLE(params.peerAddressType,               o, s); o += s;
    s = 6; payload.writeUIntLE(params.peerAddress,                   o, s); o += s;
    s = 1; payload.writeUIntLE(params.advertisingFilterPolicy,       o, s); o += s;
    s = 1; payload.writeIntLE (advertisingTxPower,                   o, s); o += s;
    s = 1; payload.writeUIntLE(params.primaryAdvertisingPhy,         o, s); o += s;
    s = 1; payload.writeUIntLE(params.secondaryAdvertisingMaxSkip,   o, s); o += s;
    s = 1; payload.writeUIntLE(params.secondaryAdvertisingPhy,       o, s); o += s;
    s = 1; payload.writeUIntLE(params.advertisingSid,                o, s); o += s;
    s = 1; payload.writeUIntLE(scanRequestNotificationEnable,        o, s); o += s;

    const result = await this.send({
      opcode: HciOpcode.build({
        ogf: HciOgf.LeControllerCommands,
        ocf: HciOcfLeControllerCommands.SetExtendedAdvertisingParameters,
      }),
      params: payload,
    });

    if (result.returnParameters.length < 1) {
      throw this.makeError(HciParserError.InvalidPayloadSize);
    }

    const selectedTxPower = result.returnParameters.readInt8(0);
    return selectedTxPower;
  }

  private buildBitfield(bits: number[]): number {
    let bitfield = 0;
    for (const bit of bits) {
      bitfield |= 1 << bit;
    }
    return bitfield;
  }

  private async send(cmd: HciCommand): Promise<HciEvtCmdComplete> {
    return new Promise<HciEvtCmdComplete>((resolve, reject) => {
      if (this.onCmdComplete !== null) {
        return reject(new Error(`Command in progress.`));
      }
      const complete = (err?: Error, evt?: HciEvtCmdComplete) => {
        clearTimeout(timeoutId);
        this.onCmdComplete = null;
        err ? reject(err) : resolve(evt!);
      };
      const timeoutId = setTimeout(() => {
        complete(new Error(`Command timeout.`));
      }, this.cmdTimeout);
      this.onCmdComplete = (evt: HciEvtCmdComplete) => {
        console.log(JSON.stringify(evt, null, 2), HciOpcode.expand(evt.opcode));
        if (this.cmdOpcode !== evt.opcode) {
          return;
        }
        if (evt.status === HciErrorCode.Success) {
          complete(undefined, evt);
        } else {
          complete(this.makeHciError(evt.status));
        }
      };
      this.cmdOpcode = cmd.opcode;
      this.sendRaw(this.buildBuffer(cmd));
    });
  }

  private makeHciError(code: number): HciError {
    return new HciError(code);
  }

  private makeError(code: HciParserError): Error {
    if (code === HciParserError.InvalidPayloadSize) {
      return new Error(`Cannot parse payload, invalid size`);
    }
    return new Error(`Unexpected error`);
  }

  private buildBuffer(cmd: HciCommand): Buffer {
    const payloadLength = cmd.params?.length ?? 0;
    const buffer = Buffer.alloc(3 + payloadLength);
    buffer.writeUInt16LE(cmd.opcode, 0);
    buffer.writeUInt8(payloadLength, 2);
    if (cmd.params && payloadLength > 0) {
      cmd.params.copy(buffer, 3);
    }
    return buffer;
  }

  private onData(data: Buffer): void {
    console.log(data);
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
      case HciEventCode.HCI_EVT_CMD_COMPLETE:
        if (payload.length < 4) {
          this.emit('parser-error', `(evt-cmd_complete) invalid payload size: ${payload.length}`);
          return;
        }
        if (this.onCmdComplete) {
          this.onCmdComplete({
            numHciPackets: payload[0],
            opcode: payload.readUInt16LE(1),
            status: payload[3],
            returnParameters: payload.slice(4),
          });
        }
        break;
    }
  }
}
