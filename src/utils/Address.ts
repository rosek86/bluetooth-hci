import crypto from "node:crypto";

import { LePeerAddressType } from "../hci/HciLeController.ts";

import { ObjectReverse } from "./Utils.ts";

// prettier-ignore
export const AddressType = Object.freeze({
  PublicDeviceAddress:   0x00, // Public Device Address
  RandomDeviceAddress:   0x01, // Random Device Address
  PublicIdentityAddress: 0x02, // Public Identity Address
  RandomIdentityAddress: 0x03, // Random (static) Identity Address
  Anonymous:             0xFF, // No address provided (anonymous advertisement)
} as const);

export type AddressType = (typeof AddressType)[keyof typeof AddressType];

export const AddressTypeToName = ObjectReverse(AddressType);

export class Address {
  private address: number;
  private type: AddressType;

  private constructor(address: number, type: AddressType | number) {
    if (!Address.numberIsAddressType(type)) {
      throw new Error(`Invalid address type: ${type}`);
    }
    this.address = address;
    this.type = type;
  }

  static numberIsAddressType(num: number): num is AddressType {
    return num in AddressTypeToName;
  }

  static random(): Address {
    const addressBytes = crypto.webcrypto.getRandomValues(new Uint8Array(8));
    addressBytes[5] |= 0xc0;
    addressBytes[6] = 0;
    addressBytes[7] = 0;
    const addressNumber = Number(new DataView(addressBytes.buffer).getBigUint64(0, true));
    return new Address(addressNumber, AddressType.RandomDeviceAddress);
  }

  static from(address: string | number, type: AddressType | number): Address {
    if (typeof address === "number") {
      return new Address(address, type);
    }

    const num = address
      .replace(/:/g, "")
      .match(/.{1,2}/g)
      ?.join("");

    if (!num) {
      return new Address(0, type);
    }

    return new Address(parseInt(num, 16), type);
  }

  public toId(): string {
    return this.address.toString(16).toLowerCase().padStart(12, "0");
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
      .padStart(12, "0")
      .match(/.{1,2}/g)!
      .join(":");
  }

  public getLePeerAddressType(): LePeerAddressType {
    if (this.type === AddressType.PublicDeviceAddress || this.type === AddressType.PublicIdentityAddress) {
      return LePeerAddressType.PublicDeviceAddress;
    }
    return LePeerAddressType.RandomDeviceAddress;
  }

  get [Symbol.toStringTag]() {
    return this.toString();
  }
}
