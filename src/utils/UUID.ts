export class UUID {
  static from(uuid: string): Buffer {
    const bytes = uuid.match(/.{1,2}/g) ?? [];
    return Buffer.from(
      bytes.reverse().map((v) => parseInt(v, 16))
    );
  }

  static toString(uuid: Buffer): string {
    const padded = uuid.toString('hex').padEnd(16, '0');
    const bytes = padded.match(/.{1,2}/g);
    return (bytes ?? []).reverse().join('');
  }
}
