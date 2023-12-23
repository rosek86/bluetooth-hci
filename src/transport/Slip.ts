enum SlipDecoderState {
  WaitBeg,
  WaitEnd,
  WaitEndEsc,
}

export class Slip {
  private readonly END = 0x0c; // indicates end of packet
  private readonly ESC = 0xdb; // indicates byte stuffing
  private readonly ESC_END = 0xdc; // ESC ESC_END means END data byte
  private readonly ESC_ESC = 0xdd; // ESC ESC_ESC means ESC data byte

  private decoderState = SlipDecoderState.WaitBeg;
  private decoderData: number[] = [];

  public encode(data: Buffer): Buffer {
    const encoded = [this.END];

    for (const byte of data) {
      switch (byte) {
        case this.END:
          encoded.push(this.ESC);
          encoded.push(this.ESC_END);
          break;
        case this.ESC:
          encoded.push(this.ESC);
          encoded.push(this.ESC_ESC);
          break;
        default:
          encoded.push(byte);
          break;
      }
    }

    encoded.push(this.END);
    return Buffer.from(encoded);
  }

  public resetDecoder(): void {
    this.decoderState = SlipDecoderState.WaitBeg;
    this.decoderData = [];
  }

  public decode(data: Buffer): Buffer[] {
    const result: Buffer[] = [];

    for (const byte of data) {
      switch (this.decoderState) {
        case SlipDecoderState.WaitBeg:
          switch (byte) {
            case this.END:
              this.decoderState = SlipDecoderState.WaitEnd;
              this.decoderData = [];
              break;
            default:
              // skip
              break;
          }
          break;

        case SlipDecoderState.WaitEnd:
          switch (byte) {
            case this.ESC:
              this.decoderState = SlipDecoderState.WaitEndEsc;
              break;
            case this.END:
              if (this.decoderData.length > 0) {
                result.push(Buffer.from(this.decoderData));
                this.decoderData = [];
              }
              break;
            default:
              this.decoderData.push(byte);
              break;
          }
          break;

        case SlipDecoderState.WaitEndEsc:
          switch (byte) {
            case this.ESC_END:
              this.decoderData.push(this.END);
              break;
            case this.ESC_ESC:
              this.decoderData.push(this.ESC);
              break;
          }
          this.decoderState = SlipDecoderState.WaitEnd;
          break;
      }
    }

    return result;
  }
}
