import { L2CAP, L2capChannelId } from "./L2CAP";

enum AttOpcode {
  ExchangeMtuReq = 0x02,
}

export class ATT {

  constructor (private l2cap: L2CAP, private connectionHandle: number) {
  }

  public async mtuExchangeRequest(mtu: number): Promise<void> {
    const buf = Buffer.allocUnsafe(3);

    buf.writeUInt8(AttOpcode.ExchangeMtuReq,  0);
    buf.writeUInt16LE(mtu,                    1);

    await this.l2cap.writeAclData(this.connectionHandle, L2capChannelId.LeAttributeProtocol, buf);
  }
}
