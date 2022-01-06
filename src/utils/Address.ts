export enum AddressType {
  Public, // Public Device Address or Public Identity Address
  Random, // Random Device Address or Random (static) Identity Address
}

export class Address {
  constructor(private address: number, private type = AddressType.Random) {
  }

  static from(address: string|number, type = AddressType.Random): Address {
    if (typeof address === 'number') {
      return new Address(address, type);
    }

    const num = address
      .replace(/:/g, '')
      .match(/.{1,2}/g)?.join('');

    if (!num) {
      return new Address(0, type);
    }

    return new Address(parseInt(num, 16), type);
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
      type: this.addressTypeToString(),
    };
  }

  private addressTypeToString(): 'public' | 'random' {
    return this.type === AddressType.Public ? 'public' : 'random';
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
