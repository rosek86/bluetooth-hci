import { webcrypto } from "node:crypto";
import EventEmitter from "node:events";

import { AesCmac } from "aes-cmac";

import { Uint8ArrayUtils } from "../utils/Uint8Array.js";
import { L2capChannelId } from "../l2cap/L2capChannelId.js";

export const SmpCommand = Object.freeze({
  PairingRequest: 0x01,
  PairingResponse: 0x02,
  PairingConfirm: 0x03,
  PairingRandom: 0x04,
  PairingFailed: 0x05,
  EncryptionInformation: 0x06,
  CentralIdentification: 0x07,
  IdentityInformation: 0x08,
  IdentityAddressInformation: 0x09,
  SigningInformation: 0x0a,
  SecurityRequest: 0x0b,
  PairingPublicKey: 0x0c,
  PairingDHKeyCheck: 0x0d,
  PairingKeypressNotification: 0x0e,
});

interface L2cap extends EventEmitter {
  on(event: "SmpData", listener: (connectionHandle: number, payload: Buffer) => void): this;
  on(event: "Disconnected", listener: (connectionHandle: number, reason: number) => void): this;

  writeAclData: (connectionHandle: number, channelId: L2capChannelId, data: Buffer) => void;
}

export class Smp {
  public async e(key: Uint8Array, plaintextData: Uint8Array) {
    key.reverse();
    const importedKey = await webcrypto.subtle.importKey("raw", key, { name: "AES-CBC", length: 128 }, false, [
      "encrypt",
    ]);
    const iv = new Uint8Array(16);
    plaintextData.reverse();
    const aesCiphertext = new Uint8Array(
      await webcrypto.subtle.encrypt({ name: "AES-CBC", iv }, importedKey, plaintextData),
    );
    return new Uint8Array(aesCiphertext.slice(0, 16).reverse());
  }

  public async ah(irk: Uint8Array, r: Uint8Array) {
    if (irk.length !== 16 || r.length !== 3) {
      throw new Error("irk must be 16 bytes");
    }

    // r' = padding || r
    r = new Uint8Array([...r, ...Array(13).fill(0)]);

    return (await this.e(irk, r)).slice(0, 3);
  }

  public async c1(
    k: Uint8Array,
    r: Uint8Array,
    preq: Uint8Array,
    pres: Uint8Array,
    iat: Uint8Array,
    ia: Uint8Array,
    rat: Uint8Array,
    ra: Uint8Array,
  ) {
    if (
      k.length !== 16 ||
      r.length !== 16 ||
      preq.length !== 7 ||
      pres.length !== 7 ||
      iat.length !== 1 ||
      ia.length !== 6 ||
      rat.length !== 1 ||
      ra.length !== 6
    ) {
      throw new Error("invalid parameters");
    }

    if (iat[0] > 1 || rat[0] > 1) {
      throw new Error("invalid parameters");
    }

    let res: Uint8Array;

    // p1 = pres || preq || rat’ || iat’
    const p1 = new Uint8Array([iat[0], rat[0], ...preq, ...pres]);
    res = Uint8ArrayUtils.xor(r, p1);
    res = await this.e(k, res);

    // p2 = padding || ia || ra
    const p2 = new Uint8Array([...ra, ...ia, 0, 0, 0, 0]);
    res = Uint8ArrayUtils.xor(res, p2);
    res = await this.e(k, res);

    return res;
  }

  public async s1(k: Uint8Array, r1: Uint8Array, r2: Uint8Array) {
    if (k.length !== 16) {
      throw new Error("invalid parameters");
    }

    // The most significant 64-bits of r1 are discarded to generate r1’ and
    // the most significant 64-bits of r2 are discarded to generate r2’.

    // r’ = r1’ || r2’
    const r = new Uint8Array([...r2.slice(0, 8), ...r1.slice(0, 8)]);
    return await this.e(k, r);
  }

  public async aesCmac(k: Uint8Array, m: Uint8Array) {
    k = new Uint8Array([...k]).reverse();
    m = new Uint8Array([...m]).reverse();
    return (await new AesCmac(k).calculate(m)).reverse();
  }

  public async f4(u: Uint8Array, v: Uint8Array, x: Uint8Array, z: Uint8Array) {
    if (u.length !== 32 || v.length !== 32 || x.length !== 16 || z.length !== 1) {
      throw new Error("invalid parameters");
    }

    const m = new Uint8Array(65);
    m[0] = z[0];
    m.set(v, 1);
    m.set(u, 33);

    return await this.aesCmac(x, m);
  }

  public async f5(w: Uint8Array, n1: Uint8Array, n2: Uint8Array, a1: Uint8Array, a2: Uint8Array) {
    if (w.length !== 32 || n1.length !== 16 || n2.length !== 16 || a1.length !== 7 || a2.length !== 7) {
      throw new Error("invalid parameters");
    }

    // The string “btle” is mapped into a keyID using ASCII as 0x62746C65.
    const btle = new Uint8Array([0x65, 0x6c, 0x74, 0x62]);
    const salt = new Uint8Array([
      0xbe, 0x83, 0x60, 0x5a, 0xdb, 0x0b, 0x37, 0x60, 0x38, 0xa5, 0xf5, 0xaa, 0x91, 0x83, 0x88, 0x6c,
    ]);
    const length = new Uint8Array([0x00, 0x01]);

    const t = await this.aesCmac(salt, w);

    const m = new Uint8Array(53);
    m.set(length, 0);
    m.set(a2, 2);
    m.set(a1, 9);
    m.set(n2, 16);
    m.set(n1, 32);
    m.set(btle, 48);

    m[52] = 0; // Counter
    const mackey = await this.aesCmac(t, m);

    m[52] = 1; // Counter
    const ltk = await this.aesCmac(t, m);

    return { mackey, ltk };
  }

  public async f6(
    w: Uint8Array,
    n1: Uint8Array,
    n2: Uint8Array,
    r: Uint8Array,
    iocap: Uint8Array,
    a1: Uint8Array,
    a2: Uint8Array,
  ) {
    if (
      w.length !== 16 ||
      n1.length !== 16 ||
      n2.length !== 16 ||
      r.length !== 16 ||
      iocap.length !== 3 ||
      a1.length !== 7 ||
      a2.length !== 7
    ) {
      throw new Error("invalid parameters");
    }

    const m = new Uint8Array(65);

    m.set(a2, 0);
    m.set(a1, 7);
    m.set(iocap, 14);
    m.set(r, 17);
    m.set(n2, 33);
    m.set(n1, 49);

    return await this.aesCmac(w, m);
  }

  public async g2(u: Uint8Array, v: Uint8Array, x: Uint8Array, y: Uint8Array) {
    if (u.length !== 32 || v.length !== 32 || x.length !== 16 || y.length !== 16) {
      throw new Error("invalid parameters");
    }

    const m = new Uint8Array(80);
    m.set(y, 0);
    m.set(v, 16);
    m.set(u, 48);

    const tmp = await this.aesCmac(x, m);

    const dv = new DataView(tmp.buffer);
    const val = dv.getUint32(0, true);

    return val % 1000000;
  }

  public async h6(w: Uint8Array, keyID: Uint8Array) {
    if (w.length !== 16 || keyID.length !== 4) {
      throw new Error("invalid parameters");
    }
    return await this.aesCmac(w, keyID);
  }

  public async h7(salt: Uint8Array, w: Uint8Array) {
    if (salt.length !== 16 || w.length !== 16) {
      throw new Error("invalid parameters");
    }
    return await this.aesCmac(salt, w);
  }
}
