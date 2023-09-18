import crypto from "node:crypto";

export class Address {
  constructor(private address: number) {
  }

  static random(): Address {
    const addressBytes = crypto.webcrypto.getRandomValues(new Uint8Array(8));
    addressBytes[5] |= 0xc0;
    addressBytes[6] = 0;
    addressBytes[7] = 0;
    const addressNumber = Number((new DataView(addressBytes.buffer)).getBigUint64(0, true));
    return new Address(addressNumber);
  }

  static from(address: string|number): Address {
    if (typeof address === 'number') {
      return new Address(address);
    }

    const num = address
      .replace(/:/g, '')
      .match(/.{1,2}/g)?.join('');

    if (!num) {
      return new Address(0);
    }

    return new Address(parseInt(num, 16));
  }

  public toId(): string {
    return this.address
      .toString(16)
      .toLowerCase()
      .padStart(12, '0');
  }

  public toNumeric(): number {
    return this.address;
  }

  public toObject() {
    return {
      address: this.toString(),
    };
  }

  public toJSON(): string {
    return JSON.stringify(this.toObject(), null, 2);
  }

  public toString(): string {
    return this.address
      .toString(16)
      .toUpperCase()
      .padStart(12, '0')
      .match(/.{1,2}/g)!
      .join(':');
  }

  get [Symbol.toStringTag]() {
    return this.toString();
  }
}
