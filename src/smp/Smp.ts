import { webcrypto } from "crypto";

export class Smp {
  public async e(key: Uint8Array, plaintextData: Uint8Array) {
    const importedKey = await webcrypto.subtle.importKey("raw", key, { name: "AES-CBC", length: 128 }, false, [
      "encrypt",
    ]);
    const iv = new Uint8Array(16);
    const aesCiphertext = await webcrypto.subtle.encrypt({ name: "AES-CBC", iv }, importedKey, plaintextData);
    return new Uint8Array(aesCiphertext.slice(0, 16));
  }

  public async ah(irk: Uint8Array, r: Uint8Array) {
    if (irk.length !== 16 || r.length !== 3) {
      throw new Error("irk must be 16 bytes");
    }

    // r' = padding || r
    r = new Uint8Array([...Array(13).fill(0), ...r]);

    return (await this.e(irk, r)).slice(-3);
  }
}
