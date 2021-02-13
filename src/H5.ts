export class H5 {
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

  public encode(
    payload: number[],
    seqNum: number, ackNum: number, crcPresent: 0|1,
    reliablePacket: 0|1, packetType: number)
  {
    const packet = [];

    this.addHeader(packet, {
      seqNum,
      ackNum,
      crcPresent,
      reliablePacket,
      packetType,
      payloadLength: payload.length,
    });

    packet.push(...payload);

    if (crcPresent) {
      this.addCrc16(packet);
    }
  }

  private addHeader(packet: number[], hdr: {
    seqNum: number,
    ackNum: number,
    crcPresent: 0|1,
    reliablePacket: 0|1,
    packetType: number,
    payloadLength: number,
  }): void {
    packet.push(
      ((hdr.seqNum         & this.seqNumMask        ) << this.seqNumPos        ) |
      ((hdr.ackNum         & this.ackNumMask        ) << this.ackNumPos        ) |
      ((hdr.crcPresent     & this.crcPresentMask    ) << this.crcPresentPos    ) |
      ((hdr.reliablePacket & this.reliablePacketMask) << this.reliablePacketPos)
    );

    packet.push(
      ((hdr.packetType    & this.packetTypeMask              ) << this.packetTypePos) |
      ((hdr.payloadLength & this.payloadLengthFirstNibbleMask) << this.payloadLengthPos)
    );

    packet.push(
      ((hdr.payloadLength & this.payloadLengthSecondNibbleMask) >> this.payloadLengthPos)
    );

    packet.push(this.calculateHeaderChecksum(packet))
  }

  private calculateHeaderChecksum(header: number[]): number {
    let checksum = header[0];
    checksum += header[1];
    checksum += header[2];
    checksum &= 0xFF;
    checksum = (~checksum + 1);
    return checksum & 0xFF;
  }

  private addCrc16(packet: number[]) {
    const crc16 = this.calculateCrc16Checksum(packet);
    packet.push((crc16 >> 0) & 0xFF);
    packet.push((crc16 >> 8) & 0xFF);
  }

  private calculateCrc16Checksum(packet: number[]): number {
    let crc = 0xFFFF;
    for (const byte of packet) {
      crc = (crc >> 8) | (crc << 8);
      crc ^= byte;
      crc ^= (crc & 0xFF) >> 4;
      crc ^= crc << 12;
      crc ^= (crc & 0xFF) << 5;
    }
    return crc & 0xFFFF;
  }
}
