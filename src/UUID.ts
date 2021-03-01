export class UUID {
  static from(uuid: string): Buffer {
    return Buffer.from(
      uuid.match(/.{1,2}/g).reverse().map((v) => parseInt(v, 16))
    );
  }
}
