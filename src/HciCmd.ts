import Debug from 'debug';

import { HciPacketType } from "./HciPacketType";

import { HciErrorCode, HciParserError } from "./HciError";
import { makeHciError, makeParserError} from "./HciError";

import {
  HciOgf,
  HciOcfControlAndBasebandCommands,
  HciOcfInformationParameters,
  HciOcfLeControllerCommands,
  HciOcfLinkControlCommands,
  HciOcfStatusParameters,
  HciOcfTestingCommands,
  HicOcfLinkPolicyCommands
} from './HciOgfOcf';

const debug = Debug('nble-hci-cmd');

type HciSendFunction = (pt: HciPacketType, data: Buffer) => void;

interface Command {
  opcode: { ogf: number; ocf: number; };
  connHandle?: number;
  payload?: Buffer;
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

export interface HciCmdResult {
  numHciPackets: number;
  opcode: number;
  status: number;
  returnParameters?: Buffer;
}

export class HciCmd {
  private onResult: ((_: HciCmdResult) => void) | null = null;

  public constructor(private sendBuffer: HciSendFunction, private timeout: number = 2000) {
  }

  public async linkControl(params: {
    ocf: HciOcfLinkControlCommands,
    connHandle?: number,
    payload?: Buffer,
  }): Promise<HciCmdResult> {
    return await this.sendWaitResult({
      opcode: {
        ogf: HciOgf.LinkControlCommands,
        ocf: params.ocf,
      },
      payload: params.payload,
      connHandle: params.connHandle,
    });
  }

  public async linkPolicy(params: {
    ocf: HicOcfLinkPolicyCommands,
    connHandle?: number,
    payload?: Buffer
  }): Promise<HciCmdResult> {
    return await this.sendWaitResult({
      opcode: {
        ogf: HciOgf.LinkPolicyCommands,
        ocf: params.ocf,
      },
      payload: params.payload,
      connHandle: params.connHandle,
    });
  }

  public async controlAndBaseband(params: {
    ocf: HciOcfControlAndBasebandCommands,
    connHandle?: number,
    payload?: Buffer
  }): Promise<HciCmdResult> {
    return await this.sendWaitResult({
      opcode: {
        ogf: HciOgf.ControlAndBasebandCommands,
        ocf: params.ocf,
      },
      payload: params.payload,
      connHandle: params.connHandle,
    });
  }

  public async controlAndBasebandNoResponse(params: {
    ocf: HciOcfControlAndBasebandCommands,
    connHandle?: number,
    payload?: Buffer
  }): Promise<void> {
    const opcode = HciOpcode.build({
      ogf: HciOgf.ControlAndBasebandCommands,
      ocf: params.ocf,
    });
    await this.sendCommand(opcode, params.payload);
  }

  public async informationParameters(params: {
    ocf: HciOcfInformationParameters,
    connHandle?: number,
    payload?: Buffer
  }): Promise<HciCmdResult> {
    return await this.sendWaitResult({
      opcode: {
        ogf: HciOgf.InformationParameters,
        ocf: params.ocf,
      },
      payload: params.payload,
      connHandle: params.connHandle,
    })
  }

  public async statusParameters(params: {
    ocf: HciOcfStatusParameters,
    connHandle?: number,
    payload?: Buffer
  }): Promise<HciCmdResult> {
    return await this.sendWaitResult({
      opcode: {
        ogf: HciOgf.StatusParameters,
        ocf: params.ocf,
      },
      payload: params.payload,
      connHandle: params.connHandle,
    })
  }

  public async testing(params: {
    ocf: HciOcfTestingCommands,
    connHandle?: number,
    payload?: Buffer
  }): Promise<HciCmdResult> {
    return await this.sendWaitResult({
      opcode: {
        ogf: HciOgf.TestingCommands,
        ocf: params.ocf,
      },
      payload: params.payload,
      connHandle: params.connHandle,
    });
  }

  public async leController(params: {
    ocf: HciOcfLeControllerCommands,
    connHandle?: number,
    payload?: Buffer
  }): Promise<HciCmdResult> {
    return await this.sendWaitResult({
      opcode: {
        ogf: HciOgf.LeControllerCommands,
        ocf: params.ocf,
      },
      payload: params.payload,
      connHandle: params.connHandle,
    });
  }

  private async sendWaitResult(cmd: Command): Promise<HciCmdResult> {
    return new Promise<HciCmdResult>((resolve, reject) => {
      const opcode = HciOpcode.build({
        ogf: cmd.opcode.ogf,
        ocf: cmd.opcode.ocf,
      });
      if (this.onResult !== null) {
        debug('cannot start command: ', cmd);
        return reject(makeParserError(HciParserError.Busy));
      }
      const complete = (err?: Error, evt?: HciCmdResult) => {
        clearTimeout(timeoutId);
        this.onResult = null;
        err ? reject(err) : resolve(evt!);
      };
      const timeoutId = setTimeout(
        () => complete(makeParserError(HciParserError.Timeout)), this.timeout
      );
      this.onResult = (evt: HciCmdResult) => {
        if (opcode !== evt.opcode) {
          return;
        }
        if (cmd.connHandle === undefined) {
          if (evt.status !== HciErrorCode.Success) {
            complete(makeHciError(evt.status));
          } else {
            complete(undefined, evt);
          }
        } else {
          if (!evt.returnParameters) {
            debug(`Return parameters are missing`);
            return;
          }
          if (evt.returnParameters.length < 2) {
            debug(`Cannot parse connection command complete event`);
            return; // NOTE: can't tell which connection
          }
          if (cmd.connHandle !== evt.returnParameters.readUInt16LE(0)) {
            return;
          }
          if (evt.status !== HciErrorCode.Success) {
            complete(makeHciError(evt.status));
          } else {
            complete(undefined, evt);
          }
        }
      };
      this.sendCommand(opcode, cmd.payload);
    });
  }

  private sendCommand(opcode: number, payload?: Buffer): void {
    this.sendBuffer(
      HciPacketType.HciCommand,
      this.buildCommand(opcode, payload)
    );
  }

  public onCmdResult(result: HciCmdResult) {
    if (this.onResult) {
      this.onResult(result);
    }
  }

  private buildCommand(opcode: number, payload?: Buffer): Buffer {
    const payloadLength = payload?.length ?? 0;
    const buffer = Buffer.allocUnsafe(3 + payloadLength);

    let o = 0;
    o = buffer.writeUIntLE(opcode,        o, 2);
    o = buffer.writeUIntLE(payloadLength, o, 1);

    if (payload && payloadLength > 0) {
      payload.copy(buffer, 3);
    }

    return buffer;
  }
}
