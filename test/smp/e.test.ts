import assert from "node:assert";
import { describe, it } from "node:test";

import { AesCmac } from "aes-cmac";

import { Smp } from "../../src/smp/Smp.js";
import { Uint8ArrayUtils } from "../../src/utils/Uint8Array.js";

describe("Test SMP functions", () => {
  it("e", async () => {
    const smp = new Smp();
    const key = new Uint8Array([
      0xe9, 0xd7, 0x8f, 0x18, 0x0c, 0xb2, 0x1d, 0xff, 0xe6, 0x10, 0x76, 0x65, 0xa1, 0xf1, 0xe2, 0xe2,
    ]);
    const plaintextData = new Uint8Array([
      0xb3, 0xe0, 0x5c, 0x03, 0xf0, 0x4b, 0x5b, 0x10, 0xb1, 0xc6, 0x78, 0xfd, 0x70, 0x14, 0x43, 0xd2,
    ]);
    const exp = new Uint8Array([
      0xcb, 0x79, 0xac, 0xd0, 0xbd, 0xe9, 0x15, 0xbe, 0x9e, 0xa1, 0xc1, 0x22, 0x0f, 0x94, 0x93, 0x0f,
    ]);

    const result = await smp.e(key, plaintextData);
    assert.deepStrictEqual(result, exp);
  });

  it("ah", async () => {
    // IRK            ec0234a3 57c8ad05 341010a6 0a397d9b
    // prand          00000000 00000000 00000000 00708194
    // M              00000000 00000000 00000000 00708194
    // AES_128        159d5fb7 2ebe2311 a48c1bdc c40dfbaa
    // ah             0dfbaa
    const smp = new Smp();
    const irk = new Uint8Array([
      0x9b, 0x7d, 0x39, 0x0a, 0xa6, 0x10, 0x10, 0x34, 0x05, 0xad, 0xc8, 0x57, 0xa3, 0x34, 0x02, 0xec,
    ]);
    const r = new Uint8Array([0x94, 0x81, 0x70]);
    const exp = new Uint8Array([0xaa, 0xfb, 0x0d]);

    const result = await smp.ah(irk, r);

    assert.deepStrictEqual(result, exp);
  });

  it("c1", async () => {
    const k = new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const r = new Uint8Array([
      0xe0, 0x2e, 0x70, 0xc6, 0x4e, 0x27, 0x88, 0x63, 0x0e, 0x6f, 0xad, 0x56, 0x21, 0xd5, 0x83, 0x57,
    ]);

    const preq = new Uint8Array([0x01, 0x01, 0x00, 0x00, 0x10, 0x07, 0x07]);
    const pres = new Uint8Array([0x02, 0x03, 0x00, 0x00, 0x08, 0x00, 0x05]);
    const iat = new Uint8Array([0x01]);
    const rat = new Uint8Array([0x00]);
    const ra = new Uint8Array([0xb6, 0xb5, 0xb4, 0xb3, 0xb2, 0xb1]);
    const ia = new Uint8Array([0xa6, 0xa5, 0xa4, 0xa3, 0xa2, 0xa1]);
    const exp = new Uint8Array([
      0x86, 0x3b, 0xf1, 0xbe, 0xc5, 0x4d, 0xa7, 0xd2, 0xea, 0x88, 0x89, 0x87, 0xef, 0x3f, 0x1e, 0x1e,
    ]);

    const smp = new Smp();
    const res = await smp.c1(k, r, preq, pres, iat, ia, rat, ra);

    assert.deepStrictEqual(res, exp);
  });

  it("s2", async () => {
    const k = new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const r1 = new Uint8Array([0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11]);
    const r2 = new Uint8Array([0x00, 0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa, 0x99]);
    const exp = new Uint8Array([
      0x62, 0xa0, 0x6d, 0x79, 0xae, 0x16, 0x42, 0x5b, 0x9b, 0xf4, 0xb0, 0xe8, 0xf0, 0xe1, 0x1f, 0x9a,
    ]);

    const smp = new Smp();
    const res = await smp.s1(k, r1, r2);

    assert.deepStrictEqual(res, exp);
  });

  it("aes-cmac", async () => {
    const aesCmac = new AesCmac(Uint8ArrayUtils.fromHex("2b7e151628aed2a6abf7158809cf4f3c"));
    const result = await aesCmac.calculate(Uint8ArrayUtils.fromHex("6bc1bee22e409f96e93d7e117393172a"));
    assert.strictEqual(Uint8ArrayUtils.toHex(result), "070a16b46b4d4144f79bdd9dd04a287c");
  });

  it("f4", async () => {
    const u = new Uint8Array([
      0xe6, 0x9d, 0x35, 0x0e, 0x48, 0x01, 0x03, 0xcc, 0xdb, 0xfd, 0xf4, 0xac, 0x11, 0x91, 0xf4, 0xef, 0xb9, 0xa5, 0xf9,
      0xe9, 0xa7, 0x83, 0x2c, 0x5e, 0x2c, 0xbe, 0x97, 0xf2, 0xd2, 0x03, 0xb0, 0x20,
    ]);
    const v = new Uint8Array([
      0xfd, 0xc5, 0x7f, 0xf4, 0x49, 0xdd, 0x4f, 0x6b, 0xfb, 0x7c, 0x9d, 0xf1, 0xc2, 0x9a, 0xcb, 0x59, 0x2a, 0xe7, 0xd4,
      0xee, 0xfb, 0xfc, 0x0a, 0x90, 0x9a, 0xbb, 0xf6, 0x32, 0x3d, 0x8b, 0x18, 0x55,
    ]);
    const x = new Uint8Array([
      0xab, 0xae, 0x2b, 0x71, 0xec, 0xb2, 0xff, 0xff, 0x3e, 0x73, 0x77, 0xd1, 0x54, 0x84, 0xcb, 0xd5,
    ]);
    const z = new Uint8Array([0x00]);
    const exp = new Uint8Array([
      0x2d, 0x87, 0x74, 0xa9, 0xbe, 0xa1, 0xed, 0xf1, 0x1c, 0xbd, 0xa9, 0x07, 0xf1, 0x16, 0xc9, 0xf2,
    ]);

    const smp = new Smp();
    const res = await smp.f4(u, v, x, z);

    assert.deepStrictEqual(res, exp);
  });

  it("f5", async () => {
    const w = new Uint8Array([
      0x98, 0xa6, 0xbf, 0x73, 0xf3, 0x34, 0x8d, 0x86, 0xf1, 0x66, 0xf8, 0xb4, 0x13, 0x6b, 0x79, 0x99, 0x9b, 0x7d, 0x39,
      0x0a, 0xa6, 0x10, 0x10, 0x34, 0x05, 0xad, 0xc8, 0x57, 0xa3, 0x34, 0x02, 0xec,
    ]);
    const n1 = new Uint8Array([
      0xab, 0xae, 0x2b, 0x71, 0xec, 0xb2, 0xff, 0xff, 0x3e, 0x73, 0x77, 0xd1, 0x54, 0x84, 0xcb, 0xd5,
    ]);
    const n2 = new Uint8Array([
      0xcf, 0xc4, 0x3d, 0xff, 0xf7, 0x83, 0x65, 0x21, 0x6e, 0x5f, 0xa7, 0x25, 0xcc, 0xe7, 0xe8, 0xa6,
    ]);
    const a1 = new Uint8Array([0xce, 0xbf, 0x37, 0x37, 0x12, 0x56, 0x00]);
    const a2 = new Uint8Array([0xc1, 0xcf, 0x2d, 0x70, 0x13, 0xa7, 0x00]);
    const expLtk = new Uint8Array([
      0x38, 0x0a, 0x75, 0x94, 0xb5, 0x22, 0x05, 0x98, 0x23, 0xcd, 0xd7, 0x69, 0x11, 0x79, 0x86, 0x69,
    ]);
    const expMackey = new Uint8Array([
      0x20, 0x6e, 0x63, 0xce, 0x20, 0x6a, 0x3f, 0xfd, 0x02, 0x4a, 0x08, 0xa1, 0x76, 0xf1, 0x65, 0x29,
    ]);

    const smp = new Smp();
    const { mackey, ltk } = await smp.f5(w, n1, n2, a1, a2);

    assert.deepStrictEqual(ltk, expLtk);
    assert.deepStrictEqual(mackey, expMackey);
  });

  it("f6", async () => {
    const w = new Uint8Array([
      0x20, 0x6e, 0x63, 0xce, 0x20, 0x6a, 0x3f, 0xfd, 0x02, 0x4a, 0x08, 0xa1, 0x76, 0xf1, 0x65, 0x29,
    ]);
    const n1 = new Uint8Array([
      0xab, 0xae, 0x2b, 0x71, 0xec, 0xb2, 0xff, 0xff, 0x3e, 0x73, 0x77, 0xd1, 0x54, 0x84, 0xcb, 0xd5,
    ]);
    const n2 = new Uint8Array([
      0xcf, 0xc4, 0x3d, 0xff, 0xf7, 0x83, 0x65, 0x21, 0x6e, 0x5f, 0xa7, 0x25, 0xcc, 0xe7, 0xe8, 0xa6,
    ]);
    const r = new Uint8Array([
      0xc8, 0x0f, 0x2d, 0x0c, 0xd2, 0x42, 0xda, 0x08, 0x54, 0xbb, 0x53, 0xb4, 0x3b, 0x34, 0xa3, 0x12,
    ]);
    const io_cap = new Uint8Array([0x02, 0x01, 0x01]);
    const a1 = new Uint8Array([0xce, 0xbf, 0x37, 0x37, 0x12, 0x56, 0x00]);
    const a2 = new Uint8Array([0xc1, 0xcf, 0x2d, 0x70, 0x13, 0xa7, 0x00]);
    const exp = new Uint8Array([
      0x61, 0x8f, 0x95, 0xda, 0x09, 0x0b, 0x6c, 0xd2, 0xc5, 0xe8, 0xd0, 0x9c, 0x98, 0x73, 0xc4, 0xe3,
    ]);

    const smp = new Smp();
    const res = await smp.f6(w, n1, n2, r, io_cap, a1, a2);

    assert.deepStrictEqual(res, exp);
  });

  it("g2", async () => {
    const u = new Uint8Array([
      0xe6, 0x9d, 0x35, 0x0e, 0x48, 0x01, 0x03, 0xcc, 0xdb, 0xfd, 0xf4, 0xac, 0x11, 0x91, 0xf4, 0xef, 0xb9, 0xa5, 0xf9,
      0xe9, 0xa7, 0x83, 0x2c, 0x5e, 0x2c, 0xbe, 0x97, 0xf2, 0xd2, 0x03, 0xb0, 0x20,
    ]);
    const v = new Uint8Array([
      0xfd, 0xc5, 0x7f, 0xf4, 0x49, 0xdd, 0x4f, 0x6b, 0xfb, 0x7c, 0x9d, 0xf1, 0xc2, 0x9a, 0xcb, 0x59, 0x2a, 0xe7, 0xd4,
      0xee, 0xfb, 0xfc, 0x0a, 0x90, 0x9a, 0xbb, 0xf6, 0x32, 0x3d, 0x8b, 0x18, 0x55,
    ]);
    const x = new Uint8Array([
      0xab, 0xae, 0x2b, 0x71, 0xec, 0xb2, 0xff, 0xff, 0x3e, 0x73, 0x77, 0xd1, 0x54, 0x84, 0xcb, 0xd5,
    ]);
    const y = new Uint8Array([
      0xcf, 0xc4, 0x3d, 0xff, 0xf7, 0x83, 0x65, 0x21, 0x6e, 0x5f, 0xa7, 0x25, 0xcc, 0xe7, 0xe8, 0xa6,
    ]);
    const expVal = 0x2f9ed5ba % 1000000;

    const smp = new Smp();
    const res = await smp.g2(u, v, x, y);

    assert.strictEqual(res, expVal);
  });

  it("h6", async () => {
    const w = new Uint8Array([
      0x9b, 0x7d, 0x39, 0x0a, 0xa6, 0x10, 0x10, 0x34, 0x05, 0xad, 0xc8, 0x57, 0xa3, 0x34, 0x02, 0xec,
    ]);
    const keyId = new Uint8Array([0x72, 0x62, 0x65, 0x6c]);
    const exp = new Uint8Array([
      0x99, 0x63, 0xb1, 0x80, 0xe2, 0xa9, 0xd3, 0xe8, 0x1c, 0xc9, 0x6d, 0xe7, 0x02, 0xe1, 0x9a, 0x2d,
    ]);

    const smp = new Smp();
    const res = await smp.h6(w, keyId);

    assert.deepStrictEqual(res, exp);
  });

  it("h7", async () => {
    const salt = new Uint8Array([
      0x31, 0x070, 0x6d, 0x74, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const w = new Uint8Array([
      0x9b, 0x7d, 0x39, 0x0a, 0xa6, 0x10, 0x10, 0x34, 0x05, 0xad, 0xc8, 0x57, 0xa3, 0x34, 0x02, 0xec,
    ]);
    const exp = new Uint8Array([
      0x11, 0x70, 0xa5, 0x75, 0x2a, 0x8c, 0x99, 0xd2, 0xec, 0xc0, 0xa3, 0xc6, 0x97, 0x35, 0x17, 0xfb,
    ]);

    const smp = new Smp();
    const res = await smp.h7(salt, w);

    assert.deepStrictEqual(res, exp);
  });
});
