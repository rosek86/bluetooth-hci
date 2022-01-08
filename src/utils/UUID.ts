export class UUID {
  static from(uuid: string): Buffer {
    const bytes = uuid.match(/.{1,2}/g) ?? [];
    return Buffer.from(
      bytes.reverse().map((v) => parseInt(v, 16))
    );
  }

  static toString(uuid: Buffer): string {
    if (uuid.length === 2) {
      return uuid.readUInt16LE().toString(16).padStart(4, '0');
    }
    if (uuid.length === 16) {
      const padded = uuid.toString('hex').padStart(16, '0');
      const bytes = padded.match(/.{1,2}/g);
      return (bytes ?? []).reverse().join('');
    }
    return '';
  }
}
