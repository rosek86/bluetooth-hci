import { EventEmitter } from "events";
import Debug from "debug";

import HciError from './HciError';

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
  returnParameters: number[];
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
    return this.send({
      opcode: HciOpcode.build({ ogf: 0x03, ocf: 0x03 }),
    });
  }

  private async send(cmd: HciCommand): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.onCmdComplete !== null) {
        return reject(new Error(`Command in progress.`));
      }
      const complete = (err?: Error) => {
        clearTimeout(timeoutId);
        this.onCmdComplete = null;
        err ? reject(err) : resolve();
      };
      const timeoutId = setTimeout(() => {
        complete(new Error(`Command timeout.`));
      }, this.cmdTimeout);
      this.onCmdComplete = (evt: HciEvtCmdComplete) => {
        console.log(JSON.stringify(evt, null, 2), HciOpcode.expand(evt.opcode));
        if (this.cmdOpcode !== evt.opcode) {
          return;
        }
        if (evt.status === 0) {
          complete();
        } else {
          const error = new Error(`Test ${HciError.codeToString(evt.status)} ${evt.returnParameters}`);
          complete(error);
        }
      };
      this.cmdOpcode = cmd.opcode;
      this.sendRaw(this.buildBuffer(cmd));
    });
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
            returnParameters: [...payload.slice(4)],
          });
        }
        break;
    }
  }
}
