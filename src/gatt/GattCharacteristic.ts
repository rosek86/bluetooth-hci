import { AttDataEntry } from './AttGlue';

import { UUID } from '../utils/UUID';
import { bitGet } from '../utils/Utils';

enum CharacteristicPropertiesBits {
  // If set, permits broadcasts of the Characteristic Value using
  // Server Characteristic Configuration Descriptor. If set, the Server
  // Characteristic Configuration Descriptor shall exist.
  Broadcast = 0,

  // If set, permits reads of the Characteristic Value using procedures
  // defined in Section 4.8
  Read = 1,

  // If set, permit writes of the Characteristic Value without response
  // using procedures defined in Section 4.9.1.
  WriteWithoutResponse = 2,

  // If set, permits writes of the Characteristic Value with response
  // using procedures defined in Section 4.9.3 or Section 4.9.4.
  Write = 3,

  // If set, permits notifications of a Characteristic Value without
  // acknowledgment using the procedure defined in Section 4.10. If
  // set, the Client Characteristic Configuration Descriptor shall exist.
  Notify = 4,

  // If set, permits indications of a Characteristic Value with acknowledgment
  // using the procedure defined in Section 4.11. If set, the
  // Client Characteristic Configuration Descriptor shall exist.
  Indicate = 5,

  // If set, permits signed writes to the Characteristic Value using the
  // procedure defined in Section 4.9.2.
  AuthenticatedSignedWrites = 6,

  // If set, additional characteristic properties are defined in the Characteristic
  // Extended Properties Descriptor defined in Section 3.3.3.1.
  // If set, the Characteristic Extended Properties Descriptor shall exist.
  ExtendedProperties = 7,
}

export interface CharacteristicProperties {
  broadcast: boolean;
  read: boolean;
  writeWithoutResponse: boolean;
  write: boolean;
  notify: boolean;
  indicate: boolean;
  authenticatedSignedWrites: boolean;
  extendedProperties: boolean;
}

export class GattCharacteristic {
  private handle: number;
  private endingHandle: number;
  private valueHandle: number;
  private properties: CharacteristicProperties;
  private uuid: string;

  public get Handle(): number { return this.handle; }
  public get EndingHandle(): number { return this.endingHandle; }
  public get ValueHandle(): number { return this.valueHandle; }
  public get UUID(): string { return this.uuid; }
  public get Properties(): CharacteristicProperties { return this.properties; }

  public static fromAttData(data: AttDataEntry): GattCharacteristic {
    return new GattCharacteristic(data);
  }

  private constructor(data: AttDataEntry) {
    const properties  = data.value.readUInt8(0);
    const valueHandle = data.value.readUInt16LE(1);
    const uuid        = data.value.slice(3);

    this.handle       = data.handle;
    this.endingHandle = data.endingHandle;
    this.properties   = this.parseProperties(properties);
    this.valueHandle  = valueHandle;
    this.uuid         = UUID.toString(uuid);
  }

  public toObject() {
    return {
      handle: this.Handle,
      endingHandle: this.EndingHandle,
      valueHandle: this.ValueHandle,
      uuid: this.UUID,
      properties: this.Properties,
    };
  }

  private parseProperties(bitsfield: number): CharacteristicProperties {
    return {
      broadcast:                  bitGet(bitsfield, CharacteristicPropertiesBits.Broadcast),
      read:                       bitGet(bitsfield, CharacteristicPropertiesBits.Read),
      writeWithoutResponse:       bitGet(bitsfield, CharacteristicPropertiesBits.WriteWithoutResponse),
      write:                      bitGet(bitsfield, CharacteristicPropertiesBits.Write),
      notify:                     bitGet(bitsfield, CharacteristicPropertiesBits.Notify),
      indicate:                   bitGet(bitsfield, CharacteristicPropertiesBits.Indicate),
      authenticatedSignedWrites:  bitGet(bitsfield, CharacteristicPropertiesBits.AuthenticatedSignedWrites),
      extendedProperties:         bitGet(bitsfield, CharacteristicPropertiesBits.ExtendedProperties),
    };
  }

  get [Symbol.toStringTag]() {
    return `${this.UUID}@${this.Handle} <-> ${this.ValueHandle}`;
  }
}
