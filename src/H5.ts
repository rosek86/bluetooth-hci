import { crc16ccitt } from 'crc';

interface H5Header {
  seqNum: number;
  ackNum: number;
  crcPresent: 0|1;
  reliablePacket: 0|1;
  packetType: number;
  payloadLength: number;
}

type H5Packet = H5Header & { payload?: Buffer; };

enum H5TransportRetCode {
  ParserSlipPayloadSize           = 1,
  ParserSlipCalculatedPayloadSize = 2,
  ParserHeaderChecksum            = 3,
  ParserPacketChecksum            = 4,
}

interface EncoderData {
  seqNum: number,
  ackNum: number,
  crcPresent: 0|1,
  reliablePacket: 0|1,
  packetType: number;
  payload: Buffer;
}

type DecoderResult = (
  { code: 0 } & H5Packet) |
  { code: H5TransportRetCode };

export default class H5 {
  private readonly h5HeaderLength = 4;

  private readonly seqNumMask                     = 0x07;
  private readonly seqNumPos                      = 0;
  private readonly ackNumMask                     = 0x07;
  private readonly ackNumPos                      = 3;
  private readonly crcPresentMask                 = 0x01;
  private readonly crcPresentPos                  = 6;
  private readonly reliablePacketMask             = 0x01;
  private readonly reliablePacketPos              = 7;
  private readonly packetTypeMask                 = 0x0F;
  private readonly packetTypePos                  = 0;
  private readonly payloadLengthFirstNibbleMask   = 0x000F;
  private readonly payloadLengthSecondNibbleMask  = 0x0FF0;
  private readonly payloadLengthPos               = 4;

  public encode(data: EncoderData): Buffer {
    const packet: number[] = [];

    this.addHeader(packet, {
      seqNum:         data.seqNum,
      ackNum:         data.ackNum,
      crcPresent:     data.crcPresent,
      reliablePacket: data.reliablePacket,
      packetType:     data.packetType,
      payloadLength:  data.payload.length,
    });

    packet.push(...data.payload);

    if (data.crcPresent) {
      this.addCrc16(packet);
    }

    return Buffer.from(packet);
  }

  private addHeader(packet: number[], hdr: H5Header): void {
    packet.push(
      ((hdr.seqNum         & this.seqNumMask        ) << this.seqNumPos        ) |
      ((hdr.ackNum         & this.ackNumMask        ) << this.ackNumPos        ) |
      ((hdr.crcPresent     & this.crcPresentMask    ) << this.crcPresentPos    ) |
      ((hdr.reliablePacket & this.reliablePacketMask) << this.reliablePacketPos)
    );

    packet.push(
      ((hdr.packetType    & this.packetTypeMask              ) << this.packetTypePos   ) |
      ((hdr.payloadLength & this.payloadLengthFirstNibbleMask) << this.payloadLengthPos)
    );

    packet.push(
      ((hdr.payloadLength & this.payloadLengthSecondNibbleMask) >> this.payloadLengthPos)
    );

    packet.push(this.calculateHeaderChecksum(Buffer.from(packet)))
  }

  private calculateHeaderChecksum(hdr: Buffer): number {
    return ~((hdr[0] + hdr[1] + hdr[2]) & 0xFF) & 0xFF;
  }

  private addCrc16(packet: number[]): void {
    const crc16 = this.calculateCrc16Checksum(Buffer.from(packet));
    packet.push((crc16 >> 0) & 0xFF);
    packet.push((crc16 >> 8) & 0xFF);
  }

  private calculateCrc16Checksum(packet: Buffer): number {
    // let crc = 0xFFFF;
    // for (const byte of packet) {
    //   crc  = (crc >> 8) | (crc << 8);
    //   crc ^= byte;
    //   crc ^= (crc & 0xFF) >> 4;
    //   crc ^= crc << 12;
    //   crc ^= (crc & 0xFF) << 5;
    // }
    // return crc & 0xFFFF;
    return crc16ccitt(packet, 0xFFFF);
  }

  public decode(slipPayload: Buffer): DecoderResult {
    if (slipPayload.length < this.h5HeaderLength) {
      return { code: H5TransportRetCode.ParserSlipPayloadSize };
    }

    const seqNum         = ((slipPayload[0] >> this.seqNumPos        ) & this.seqNumMask        );
    const ackNum         = ((slipPayload[0] >> this.ackNumPos        ) & this.ackNumMask        );
    const crcPresent     = ((slipPayload[0] >> this.crcPresentPos    ) & this.crcPresentMask    );
    const reliablePacket = ((slipPayload[0] >> this.reliablePacketPos) & this.reliablePacketMask);
    const packetType     = ((slipPayload[1] >> this.packetTypePos    ) & this.packetTypeMask    );
    const payloadLength  = (
      ((slipPayload[1] >> this.payloadLengthPos) & this.payloadLengthFirstNibbleMask) |
      ((slipPayload[2] << this.payloadLengthPos) & 0xFF)
    );
    const headerChecksum = slipPayload[3];

    const calculatedPayloadSize = payloadLength + this.h5HeaderLength + (crcPresent ? 2 : 0);

    if (slipPayload.length !== calculatedPayloadSize) {
      return { code: H5TransportRetCode.ParserSlipCalculatedPayloadSize };
    }

    const calculatedHeaderChecksum = this.calculateHeaderChecksum(slipPayload);

    if (headerChecksum !== calculatedHeaderChecksum) {
      return { code: H5TransportRetCode.ParserHeaderChecksum };
    }

    if (crcPresent) {
      const packetChecksum = (
        (slipPayload[payloadLength + this.h5HeaderLength + 0] << 0) +
        (slipPayload[payloadLength + this.h5HeaderLength + 1] << 8)
      );
      const calculatedPacketChecksum = this.calculateCrc16Checksum(
        slipPayload.slice(0, payloadLength + this.h5HeaderLength)
      );
      if (packetChecksum !== calculatedPacketChecksum) {
        return { code: H5TransportRetCode.ParserPacketChecksum };
      }
    }

    const result: DecoderResult = {
      code: 0,
      seqNum,
      ackNum,
      crcPresent: crcPresent ? 1:0,
      reliablePacket: reliablePacket ? 1:0,
      packetType,
      payloadLength,
    };

    if (payloadLength > 0) {
      result.payload = Buffer.from(slipPayload.slice(
        this.h5HeaderLength, this.h5HeaderLength + payloadLength
      ));
    }

    return result;
  }
}
