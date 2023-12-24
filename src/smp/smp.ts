import crypto from "crypto";

export class Smp {
  public e(key: Uint8Array, plaintextData: Uint8Array) {
    const cipher = crypto.createCipheriv("aes-128-ccm", key, Buffer.alloc(16, 0), {
      authTagLength: 16,
    });

    const encrypted = cipher.update(plaintextData);
    cipher.final();
    return encrypted;
  }
}
