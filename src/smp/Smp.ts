import { webcrypto } from "crypto";
import { Uint8ArrayUtils } from "../utils/Uint8Array";

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
    if (k.length !== 16 || r1.length !== 16 || r2.length !== 16) {
      throw new Error("invalid parameters");
    }

    // The most significant 64-bits of r1 are discarded to generate r1’ and
    // the most significant 64-bits of r2 are discarded to generate r2’.

    // r’ = r1’ || r2’
    const r = new Uint8Array([...r1.slice(8), ...r2.slice(8)]);
    return await this.e(k, r);
  }
}
