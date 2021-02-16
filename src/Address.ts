export class Address {
  constructor(private address: number) {
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

  public toJSON(): string {
    return this.toString();
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
