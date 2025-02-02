import { HciPacketType, numberToHciPacketType } from "../hci/HciPacketType.ts";

const ParserState = Object.freeze({
  Type: 0,
  Header: 1,
  Payload: 2,
} as const);

type ParserState = (typeof ParserState)[keyof typeof ParserState];

type PacketHdrSize = Partial<Record<number, number>>;

export interface H4Packet {
  type: HciPacketType;
  packet: Uint8Array;
}

export class H4 {
  private readonly headerSize: PacketHdrSize = {
    [HciPacketType.HciCommand]: 3,
    [HciPacketType.HciAclData]: 4,
    [HciPacketType.HciSyncData]: 3,
    [HciPacketType.HciEvent]: 2,
    [HciPacketType.HciIsoData]: 4,
  };

  private parserState: ParserState = ParserState.Type;
  private parserPacketType: HciPacketType = HciPacketType.Ack;
  private parserPacketData = new Uint8Array(0);

  private parserHeaderSize = 0;
  private parserPacketSize = 0;

  public parse(data: Buffer): H4Packet | null {
    const tmp = new Uint8Array(this.parserPacketData.length + data.length);
    tmp.set(this.parserPacketData);
    tmp.set(data, this.parserPacketData.length);
    this.parserPacketData = tmp;

    if (this.parserState === ParserState.Type) {
      if (this.parserPacketData.length > 0) {
        this.parserPacketType = numberToHciPacketType(this.parserPacketData[0]);
        this.parserPacketData = this.parserPacketData.subarray(1);
        this.parserHeaderSize = this.headerSize[this.parserPacketType] ?? 0;

        this.parserState = ParserState.Header;
      }
    }

    if (this.parserState === ParserState.Header) {
      if (this.parserPacketData.length >= this.parserHeaderSize) {
        this.parserPacketSize = this.parserHeaderSize + this.getPayloadSize();

        this.parserState = ParserState.Payload;
      }
    }

    if (this.parserState === ParserState.Payload) {
      if (this.parserPacketData.length >= this.parserPacketSize) {
        const packet = this.parserPacketData.subarray(0, this.parserPacketSize);
        this.parserPacketData = this.parserPacketData.subarray(this.parserPacketSize);

        this.parserState = ParserState.Type;

        return { type: this.parserPacketType, packet };
      }
    }

    return null;
  }

  private getPayloadSize(): number {
    const dv = new DataView(
      this.parserPacketData.buffer,
      this.parserPacketData.byteOffset,
      this.parserPacketData.byteLength,
    );
    switch (this.parserPacketType) {
      case HciPacketType.HciCommand:
        return dv.getUint8(2);
      case HciPacketType.HciAclData:
        return dv.getUint16(2, true);
      case HciPacketType.HciSyncData:
        return dv.getUint8(2);
      case HciPacketType.HciEvent:
        return dv.getUint8(1);
      case HciPacketType.HciIsoData:
        // TODO: it is not clear to me how to parse size
        break;
    }
    return 0;
  }
}
