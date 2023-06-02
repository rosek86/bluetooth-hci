import crypto from "node:crypto";
import { LePeerAddressType } from "../hci/HciLeController";

export enum AddressType {
  Public, // Public Device Address or Public Identity Address
  Random, // Random Device Address or Random (static) Identity Address
}

export class Address {
  constructor(private address: number, private type = AddressType.Random) {
  }

  static random(): Address {
    const addressBytes = crypto.webcrypto.getRandomValues(new Uint8Array(8));
    addressBytes[5] |= 0xc0;
    addressBytes[6] = 0;
    addressBytes[7] = 0;
    const addressNumber = Number((new DataView(addressBytes.buffer)).getBigUint64(0, true));
    return new Address(addressNumber, AddressType.Random);
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

  public get Type(): AddressType {
    return this.type;
  }

  public get LePeerAddressType(): LePeerAddressType {
    if (this.type === AddressType.Public) {
      return LePeerAddressType.PublicDeviceAddress;
    }
    return LePeerAddressType.RandomDeviceAddress;
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
