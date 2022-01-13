export class UUID {
  static from(uuid: string | number, size?: 2|16): Buffer {
    if (typeof uuid === 'number') {
      if (!size) {
        throw new Error('UUID size is missing');
      }
      return this.fromNumber(uuid, size);
    }
    if (typeof uuid === 'string') {
      return this.fromString(uuid);
    }
    throw new Error('Unsupported uuid type');
  }

  private static fromNumber(uuid: number, size: number): Buffer {
    if (uuid > Number.MAX_SAFE_INTEGER || Number.isInteger(uuid) === false) {
      throw new Error('Invalid UUID value');
    }
    const buffer = Buffer.alloc(size);
    buffer.writeUInt16LE(uuid, 0);
    return buffer;
  }

  private static fromString(uuid: string): Buffer {
    const bytes = uuid.match(/.{1,2}/g) ?? [];
    return Buffer.from(
      bytes.reverse().map((v) => parseInt(v, 16))
    );
  }

  static toString(uuid: Buffer): string {
    if (![2, 16].includes(uuid.length)) {
      throw new Error(`Invalid UUID length: ${uuid.length}`);
    }
    const padded = uuid.toString('hex').padEnd(uuid.length, '0');
    const bytes = padded.match(/.{1,2}/g);
    return (bytes ?? []).reverse().join('');
  }
}
