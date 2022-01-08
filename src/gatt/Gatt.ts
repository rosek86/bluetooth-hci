import { Att } from '../att/Att';
import { AttAttributeDataEntry, AttReadByGroupTypeRsp, AttReadByGroupTypeRspMsg, AttReadByTypeRspMsg } from '../att/AttSerDes';

export class Gatt {
  private readonly GATT_PRIM_SVC_UUID = Buffer.from([0x00, 0x28]);
  private readonly GATT_INCLUDE_UUID = Buffer.from([0x02, 0x28]);
  private readonly GATT_CHARAC_UUID = Buffer.from([0x03, 0x28]);

  constructor(private att: Att) {}

  async discoverServices(): Promise<AttReadByGroupTypeRspMsg['attributeDataList']> {
    return await this.readByGroupTypeReq(this.GATT_PRIM_SVC_UUID, 1, 0xFFFF);
  }

  async discoverIncludedServices(service: AttReadByGroupTypeRspMsg['attributeDataList'][0]) {
    return await this.readByType(this.GATT_INCLUDE_UUID, service.attributeHandle, service.endGroupHandle);
  }

  async discoverCharacteristics(service: AttReadByGroupTypeRspMsg['attributeDataList'][0]) {
    return await this.readByType(this.GATT_CHARAC_UUID, service.attributeHandle, service.endGroupHandle);
  }

  private async readByGroupTypeReq(attributeGroupType: Buffer, startingHandle: number, endingHandle: number): Promise<AttReadByGroupTypeRspMsg['attributeDataList']> {
    const attributeData: AttReadByGroupTypeRspMsg = { attributeDataList: [] };
    try {
      --startingHandle;
      while (startingHandle !== endingHandle) {
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
      while (startingHandle !== endingHandle) {
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
