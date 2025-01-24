import { describe, it } from "node:test";

import { H5 } from "../src/transport/H5";

describe("H5", function () {
  describe("encode()", function () {
    it("should return -1 when the value is not present", function () {
      // assert.strictEqual([1, 2, 3].indexOf(4), -1);
      const h5 = new H5();
      const packet = h5.encode({
        seqNum: 0,
        ackNum: 0,
        crcPresent: 1,
        reliablePacket: 1,
        packetType: 1,
        payload: new Uint8Array([]),
      });
      void packet;
      // console.log(packet);
    });
  });
});
