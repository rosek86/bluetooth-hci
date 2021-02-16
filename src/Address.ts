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

  public toNumeric(): number {
    return this.address;
  }

  public toString(): string {
    return this.address
      .toString(16)
      .padStart(12, '0')
      .match(/.{1,2}/g)!
      .join(':');
  }
}
