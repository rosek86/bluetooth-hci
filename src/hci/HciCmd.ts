import Debug from "debug";
import assert from "assert";

import { HciPacketType } from "./HciPacketType.js";

import { HciErrorErrno, HciParserErrorType } from "./HciError.js";
import { makeHciError, makeParserError } from "./HciError.js";

import {
  HciOgf,
  HciOcfControlAndBasebandCommands,
  HciOcfInformationParameters,
  HciOcfLeControllerCommands,
  HciOcfLinkControlCommands,
  HciOcfStatusParameters,
  HciOcfTestingCommands,
  HicOcfLinkPolicyCommands,
  ocfOgfToString,
} from "./HciOgfOcf.js";

const debug = Debug("bt-hci-hci-cmd");

type HciSendFunction = (pt: HciPacketType, data: Buffer) => void;

interface Command {
  opcode: { ogf: number; ocf: number };
  payload?: Buffer;
  connectionHandle?: number;
  advertisingHandle?: number;
}

class HciOpcode {
  public static build(opcode: { ogf: number; ocf: number }): number {
    return (opcode.ogf << 10) | opcode.ocf;
  }

  public static expand(opcode: number): { ogf: number; ocf: number } {
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

interface HciPendingCommand {
  opcode: number;
  connectionHandle?: number;
  advertisingHandle?: number;
  onResult: (evt: HciCmdResult) => void;
}

export class HciCmd {
  private pendingCommands: HciPendingCommand[] = [];

  public constructor(private sendBuffer: HciSendFunction, public readonly timeout: number = 2_000) {}

  public async linkControl(params: {
    ocf: HciOcfLinkControlCommands;
    connectionHandle?: number;
    payload?: Buffer;
  }): Promise<HciCmdResult> {
    return await this.sendWaitResult({
      opcode: {
        ogf: HciOgf.LinkControlCommands,
        ocf: params.ocf,
      },
      payload: params.payload,
      connectionHandle: params.connectionHandle,
    });
  }

  public async linkPolicy(params: {
    ocf: HicOcfLinkPolicyCommands;
    connectionHandle?: number;
    payload?: Buffer;
  }): Promise<HciCmdResult> {
    return await this.sendWaitResult({
      opcode: {
        ogf: HciOgf.LinkPolicyCommands,
        ocf: params.ocf,
      },
      payload: params.payload,
      connectionHandle: params.connectionHandle,
    });
  }

  public async controlAndBaseband(params: {
    ocf: HciOcfControlAndBasebandCommands;
    connectionHandle?: number;
    payload?: Buffer;
  }): Promise<HciCmdResult> {
    return await this.sendWaitResult({
      opcode: {
        ogf: HciOgf.ControlAndBasebandCommands,
        ocf: params.ocf,
      },
      payload: params.payload,
      connectionHandle: params.connectionHandle,
    });
  }

  public async controlAndBasebandNoResponse(params: {
    ocf: HciOcfControlAndBasebandCommands;
    connectionHandle?: number;
    payload?: Buffer;
  }): Promise<void> {
    const opcode = HciOpcode.build({
      ogf: HciOgf.ControlAndBasebandCommands,
      ocf: params.ocf,
    });
    await this.sendCommand(opcode, params.payload);
  }

  public async informationParameters(params: {
    ocf: HciOcfInformationParameters;
    connectionHandle?: number;
    payload?: Buffer;
  }): Promise<HciCmdResult> {
    return await this.sendWaitResult({
      opcode: {
        ogf: HciOgf.InformationParameters,
        ocf: params.ocf,
      },
      payload: params.payload,
      connectionHandle: params.connectionHandle,
    });
  }

  public async statusParameters(params: {
    ocf: HciOcfStatusParameters;
    connectionHandle?: number;
    payload?: Buffer;
  }): Promise<HciCmdResult> {
    return await this.sendWaitResult({
      opcode: {
        ogf: HciOgf.StatusParameters,
        ocf: params.ocf,
      },
      payload: params.payload,
      connectionHandle: params.connectionHandle,
    });
  }

  public async testing(params: {
    ocf: HciOcfTestingCommands;
    connectionHandle?: number;
    payload?: Buffer;
  }): Promise<HciCmdResult> {
    return await this.sendWaitResult({
      opcode: {
        ogf: HciOgf.TestingCommands,
        ocf: params.ocf,
      },
      payload: params.payload,
      connectionHandle: params.connectionHandle,
    });
  }

  public async leController(params: {
    ocf: HciOcfLeControllerCommands;
    payload?: Buffer;
    connectionHandle?: number;
    advertisingHandle?: number;
  }): Promise<HciCmdResult> {
    return await this.sendWaitResult({
      opcode: {
        ogf: HciOgf.LeControllerCommands,
        ocf: params.ocf,
      },
      payload: params.payload,
      connectionHandle: params.connectionHandle,
      advertisingHandle: params.advertisingHandle,
    });
  }

  private async sendWaitResult(cmd: Command): Promise<HciCmdResult> {
    return new Promise<HciCmdResult>((resolve, reject) => {
      const opcode = HciOpcode.build({
        ogf: cmd.opcode.ogf,
        ocf: cmd.opcode.ocf,
      });
      const dropPendingCommand = () => {
        for (let i = 0; i < this.pendingCommands.length; ++i) {
          if (this.pendingCommands[i].onResult === onResult) {
            this.pendingCommands.splice(i, 1);
            break;
          }
        }
      };
      const complete = (err?: Error, evt?: HciCmdResult) => {
        clearTimeout(timeoutId);
        dropPendingCommand();
        err ? reject(err) : resolve(evt!);
      };
      const timeoutId = setTimeout(() => complete(makeParserError(HciParserErrorType.Timeout)), this.timeout);
      const onResult = (evt: HciCmdResult) => {
        debug(evt);
        if (evt.status !== HciErrorErrno.Success) {
          const message =
            `${ocfOgfToString(cmd.opcode.ocf, cmd.opcode.ogf)}` +
            ` failed with status ${HciErrorErrno[evt.status]}` +
            `\n    -> cmd: ${JSON.stringify(cmd)}` +
            `\n    -> evt: ${JSON.stringify(evt)}`;
          complete(makeHciError(message, evt.status));
        } else {
          complete(undefined, evt);
        }
      };
      this.pendingCommands.push({
        opcode,
        onResult,
        connectionHandle: cmd.connectionHandle,
        advertisingHandle: cmd.advertisingHandle,
      });
      debug(opcode, cmd.payload);
      this.sendCommand(opcode, cmd.payload);
    });
  }

  private sendCommand(opcode: number, payload?: Buffer): void {
    this.sendBuffer(HciPacketType.HciCommand, this.buildCommand(opcode, payload));
  }

  public onCmdResult(evt: HciCmdResult) {
    for (const cmd of this.pendingCommands) {
      if (cmd.opcode !== evt.opcode) {
        continue;
      }

      if (cmd.connectionHandle !== undefined) {
        // parse connection handle
        assert(evt.returnParameters, "Return parameters are missing");
        assert(evt.returnParameters.length >= 2, "Cannot parse connection command complete event");
        if (cmd.connectionHandle !== evt.returnParameters.readUInt16LE(0)) {
          continue;
        }
      }

      if (cmd.advertisingHandle !== undefined) {
        // parse advertising handle
        assert(evt.returnParameters, "Return parameters are missing");
        assert(evt.returnParameters.length >= 1, "Cannot parse advertising command complete event");
        if (cmd.advertisingHandle !== evt.returnParameters.readUInt8(0)) {
          continue;
        }
      }

      cmd.onResult(evt);
    }
  }

  private buildCommand(opcode: number, payload?: Buffer): Buffer {
    const payloadLength = payload?.length ?? 0;
    const buffer = Buffer.alloc(3 + payloadLength);

    let o = 0;
    o = buffer.writeUIntLE(opcode, o, 2);
    buffer.writeUIntLE(payloadLength, o, 1);

    if (payload && payloadLength > 0) {
      payload.copy(buffer, 3);
    }

    return buffer;
  }
}
