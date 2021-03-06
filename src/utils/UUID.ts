export class UUID {
  static from(uuid: string): Buffer {
    const bytes = uuid.match(/.{1,2}/g) ?? [];
    return Buffer.from(
      bytes.reverse().map((v) => parseInt(v, 16))
    );
  }
}
