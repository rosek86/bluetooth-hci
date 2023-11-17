import { AttDataEntry } from './AttGlue.js';

import { UUID } from '../utils/UUID.js';

export namespace GattDescriptor {
  export interface AsObject {
    handle: number;
    endingHandle: number;
    uuid: string;
    uuid16?: number;
    uuidInfo?: {
      for: string;
      type: string;
    };
  }
}

export class GattDescriptor {
  private handle: number;
  private endingHandle: number;
  private uuid: string;
  private uuidBuffer: Buffer;
  private uuid16?: number;

  public get Handle(): number { return this.handle; }
  public get EndingHandle(): number { return this.endingHandle; }
  public get UUID(): string { return this.uuid; }
  public get UUID16(): number | undefined { return this.uuid16; }
  public get UUIDBuffer(): Buffer { return this.uuidBuffer; }

  public static fromAttData(data: AttDataEntry): GattDescriptor {
    return new GattDescriptor(data);
  }

  private constructor(data: AttDataEntry) {
    this.handle       = data.handle;
    this.endingHandle = data.endingHandle;
    this.uuid         = UUID.toString(data.value);
    this.uuidBuffer   = data.value;
    this.uuid16       = data.value.length === 2 ? data.value.readUInt16LE(0) : undefined;
  }

  public toObject(): GattDescriptor.AsObject {
    return {
      handle: this.Handle,
      endingHandle: this.EndingHandle,
      uuid: this.UUID,
      uuid16: this.UUID16,
    };
  }

  get [Symbol.toStringTag]() {
    return `${this.UUID}@${this.Handle}`;
  }
}
