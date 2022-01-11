export class UUID {
  static from(uuid: string): Buffer {
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
