import { Att } from '../att/Att';
import { AttReadByGroupTypeRspMsg, AttReadByTypeRspMsg } from '../att/AttSerDes';
import { UUID } from '../utils/UUID';

export interface GattService {
  handle: number;
  uuid: string;
  endGroupHandle: number;
}

export interface GattIncService {
  handle: number;
  uuid: string;
}

export interface GattCharacteristic {
  handle: number;
  properties: number;
  uuid: string;
  valueHandle: number;
}

export class Gatt {
  private readonly GATT_PRIM_SVC_UUID = Buffer.from([0x00, 0x28]);
  private readonly GATT_INCLUDE_UUID = Buffer.from([0x02, 0x28]);
  private readonly GATT_CHARAC_UUID = Buffer.from([0x03, 0x28]);

  constructor(private att: Att) {}

  async discoverServices(): Promise<GattService[]> {
    const entries = await this.readByGroupTypeReq(this.GATT_PRIM_SVC_UUID, 1, 0xFFFF);
    console.log(entries);
    return entries.map((x) => ({
      handle: x.attributeHandle,
      uuid: UUID.toString(x.attributeValue),
      endGroupHandle: x.endGroupHandle,
    }));
  }

  async discoverIncludedServices(service: GattService): Promise<GattIncService[]> {
    const entries = await this.readByType(this.GATT_INCLUDE_UUID, service.handle, service.endGroupHandle);
    return entries.map((x) => ({
      handle: x.handle,
      uuid: UUID.toString(x.value),
    }));
  }

  async discoverCharacteristics(service: GattService): Promise<GattCharacteristic[]> {
    const entries = await this.readByType(this.GATT_CHARAC_UUID, service.handle, service.endGroupHandle);
    console.log(entries);
    return entries.map((e) => {
      const properties = e.value.readUInt8(0);
      const valueHandle = e.value.readUInt16LE(1);
      const uuid = UUID.toString(e.value.slice(3));
      return { handle: e.handle, properties, valueHandle, uuid };
    });
  }

  private async readByGroupTypeReq(attributeGroupType: Buffer, startingHandle: number, endingHandle: number): Promise<AttReadByGroupTypeRspMsg['attributeDataList']> {
    const attributeData: AttReadByGroupTypeRspMsg = { attributeDataList: [] };
    try {
      --startingHandle;
      while (startingHandle < endingHandle) {
        const data = await this.att.readByGroupTypeReq({
          startingHandle: startingHandle + 1,
          endingHandle: endingHandle,
          attributeGroupType,
        });
        for (const entry of data?.attributeDataList ?? []) {
          attributeData.attributeDataList.push(entry);
        }
        startingHandle = data?.attributeDataList.at(-1)?.endGroupHandle ?? endingHandle;
      }
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code !== 'AttributeNotFound') {
        throw err;
      }
    }
    return attributeData.attributeDataList;
  }

  private async readByType(attributeType: Buffer, startingHandle: number, endingHandle: number): Promise<AttReadByTypeRspMsg['attributeDataList']> {
    const attributeData: AttReadByTypeRspMsg = { attributeDataList: [] };
    try {
      --startingHandle;
      while (startingHandle < endingHandle) {
        const data = await this.att.readByTypeReq({
          startingHandle: startingHandle + 1,
          endingHandle: endingHandle,
          attributeType,
        });
        for (const entry of data?.attributeDataList ?? []) {
          attributeData.attributeDataList.push(entry);
        }
        startingHandle = data?.attributeDataList.at(-1)?.handle ?? endingHandle;
      }
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code !== 'AttributeNotFound') {
        throw err;
      }
    }
    return attributeData.attributeDataList;
  }
}
