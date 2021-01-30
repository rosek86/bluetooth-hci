import { EventEmitter } from "events";

interface HciInit {
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
  returnParameter: number;
}

export default class Hci extends EventEmitter {
  private sendRaw: (data: Buffer) => void;

  public constructor(init: HciInit) {
    super();

    this.sendRaw = init.send;
    init.setEventHandler(this.onData.bind(this));
  }

  public async reset() {
    // TODO: wait reply
    const opcode = this.buildOpcode({ ogf: 0x03, ocf: 0x03 });
    return this.send({ opcode });
  }

  private buildOpcode(opcode: { ogf: number, ocf: number }) {
    return opcode.ogf << 10 | opcode.ocf;
  }

  private expandOpcode(opcode: number): { ogf: number, ocf: number } {
    // return 
  }


  private async send(cmd: HciCommand): Promise<void> {
    const payloadLength = cmd.params?.length ?? 0;
    const buffer = Buffer.alloc(3 + payloadLength);
    buffer.writeUInt16LE(cmd.opcode, 0);
    buffer.writeUInt8(payloadLength, 2);
    if (cmd.params && payloadLength > 0) {
      cmd.params.copy(buffer, 3);
    }
    this.sendRaw(buffer);
  }

  private onData(data: Buffer): void {
    console.log(data);
    const eventCode = data[0];
    switch (eventCode) {
      case HciEventCode.HCI_EVT_CMD_COMPLETE:

        break;
    }
  }
}
