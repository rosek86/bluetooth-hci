export default class Address {
  constructor(private address: number) {
  }

  static from(address: string): Address|null {
    const num = address
      .replace(/:/g, '')
      .match(/.{1,2}/g)?.join('');

    if (!num) {
      return null;
    }

    return new Address(parseInt(num, 16));
  }

  public get Address(): number {
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
