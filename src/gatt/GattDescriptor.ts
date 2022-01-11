import { AttDataEntry } from './AttGlue';

import { UUID } from '../utils/UUID';

export class GattDescriptor {
  private handle: number;
  private endingHandle: number;
  private uuid: string;

  public get Handle(): number { return this.handle; }
  public get EndingHandle(): number { return this.endingHandle; }
  public get UUID(): string { return this.uuid; }

  public static fromAttData(data: AttDataEntry): GattDescriptor {
    return new GattDescriptor(data);
  }

  private constructor(data: AttDataEntry) {
    this.handle       = data.handle;
    this.endingHandle = data.endingHandle;
    this.uuid         = UUID.toString(data.value);
  }

  public toObject() {
    return {
      handle: this.Handle,
      endingHandle: this.EndingHandle,
      uuid: this.UUID,
    };
  }

  get [Symbol.toStringTag]() {
    return `${this.UUID}@${this.Handle}`;
  }
}
