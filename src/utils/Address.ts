import crypto from "node:crypto";
import { LePeerAddressType } from "../hci/HciLeController.js";

export enum AddressType {
  PublicDeviceAddress   = 0x00, // Public Device Address
  RandomDeviceAddress   = 0x01, // Random Device Address
  PublicIdentityAddress = 0x02, // Public Identity Address
  RandomIdentityAddress = 0x03, // Random (static) Identity Address
  Anonymous             = 0xFF, // No address provided (anonymous advertisement)
}

export class Address {
  private constructor(private address: number, private type: AddressType) {
  }

  static random(): Address {
    const addressBytes = crypto.webcrypto.getRandomValues(new Uint8Array(8));
    addressBytes[5] |= 0xc0;
    addressBytes[6] = 0;
    addressBytes[7] = 0;
    const addressNumber = Number((new DataView(addressBytes.buffer)).getBigUint64(0, true));
    return new Address(addressNumber, AddressType.RandomDeviceAddress);
  }

  static from(address: string|number, type: AddressType): Address {
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

  public getLePeerAddressType(): LePeerAddressType {
    return this.type === AddressType.PublicDeviceAddress ?
      LePeerAddressType.PublicDeviceAddress :
      LePeerAddressType.RandomDeviceAddress;
  }

  get [Symbol.toStringTag]() {
    return this.toString();
  }
}
