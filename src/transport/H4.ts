import { HciPacketType } from '../hci/HciPacketType';

enum ParserState {
  Type, Header, Payload,
}

type PacketHdrSize = Partial<Record<number, number>>;

export interface H4Packet { type: number; packet: Buffer; }

export class H4 {
  private readonly headerSize: PacketHdrSize = {};

  private parserState = ParserState.Type;
  private parserPacketType = 0;
  private parserPacketData = Buffer.allocUnsafe(0);

  private parserHeaderSize = 0;
  private parserPacketSize = 0;

  constructor() {
    this.headerSize[HciPacketType.HciCommand]  = 3;
    this.headerSize[HciPacketType.HciAclData]  = 4;
    this.headerSize[HciPacketType.HciSyncData] = 3;
    this.headerSize[HciPacketType.HciEvent]    = 2;
    this.headerSize[HciPacketType.HciIsoData]  = 4;
  }

  public parse(data: Buffer): H4Packet | null {
    this.parserPacketData = Buffer.concat([ this.parserPacketData, data ]);

    if (this.parserState === ParserState.Type) {
      if (this.parserPacketData.length > 0) {
        this.parserPacketType = this.parserPacketData[0];
        this.parserPacketData = this.parserPacketData.slice(1);
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
        const packet = this.parserPacketData.slice(0, this.parserPacketSize);
        this.parserPacketData = this.parserPacketData.slice(this.parserPacketSize);

        this.parserState = ParserState.Type;

        return { type: this.parserPacketType, packet };
      }
    }

    return null;
  }

  private getPayloadSize(): number {
    switch (this.parserPacketType) {
      case HciPacketType.HciCommand:
        return this.parserPacketData.readUInt8(2);
      case HciPacketType.HciAclData:
        return this.parserPacketData.readUInt16LE(2);
      case HciPacketType.HciSyncData:
        return this.parserPacketData.readUInt8(2);
      case HciPacketType.HciEvent:
        return this.parserPacketData.readUInt8(1);
      case HciPacketType.HciIsoData:
        // TODO: it is not clear to me how to parse size
        break;
    }
    return 0;
  }
}
