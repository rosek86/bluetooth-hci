import { Att } from '../att/Att';
import { AttReadByGroupTypeRsp, AttReadByGroupTypeRspMsg } from '../att/AttSerDes';

export class Gatt {
  private readonly GATT_PRIM_SVC_UUID = Buffer.from([0x00, 0x28]);
  private readonly GATT_INCLUDE_UUID = Buffer.from([0x02, 0x28]);
  private readonly GATT_CHARAC_UUID = Buffer.from([0x03, 0x28]);

  constructor(private att: Att) {}

  async discoverServices(): Promise<AttReadByGroupTypeRspMsg> {
    const endingHandle = 0xFFFF;
    const attributeData: AttReadByGroupTypeRspMsg = { attributeDataList: [] };
    let startingHandle = 0;
    while (startingHandle !== endingHandle) {
      const data = await this.att.readByGroupTypeReq({
        startingHandle: startingHandle + 1,
        endingHandle: endingHandle,
        attributeGroupType: this.GATT_PRIM_SVC_UUID,
      });
      for (const entry of data?.attributeDataList ?? []) {
        attributeData.attributeDataList.push(entry);
      }
      startingHandle = data?.attributeDataList.at(-1)?.endGroupHandle ?? endingHandle;
    }
    return attributeData;
  }

  async discoverIncludedServices(service: AttReadByGroupTypeRspMsg['attributeDataList'][0]) {
    const data = await this.att.readByGroupTypeReq({
      startingHandle: service.attributeHandle,
      endingHandle: service.endGroupHandle,
      attributeGroupType: this.GATT_INCLUDE_UUID,
    });
    console.log(data);
  }
}
