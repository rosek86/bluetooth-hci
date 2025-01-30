import assert from "node:assert";
import { describe, it } from "node:test";

import { HciErrorErrno } from "../../../src/hci/HciError.ts";
import { LePeriodicAdvertisingSyncEstablishedV1 } from "../../../src/hci/HciEvent.ts";
import { Address } from "../../../src/utils/Address.ts";

describe("LePeriodicAdvertisingSyncEstablishedV1", () => {
  it("should parse a valid buffer with success status", () => {
    const buffer = Buffer.from([
      0x00, // Status: Success
      0x01,
      0x00, // Sync_Handle
      0x02, // Advertising_SID
      0x00, // Advertiser_Address_Type
      0x01,
      0x02,
      0x03,
      0x04,
      0x05,
      0x06, // Advertiser_Address
      0x01, // Advertiser_PHY
      0x20,
      0x03, // Periodic_Advertising_Interval
      0x01, // Advertiser_Clock_Accuracy
    ]);

    const result = LePeriodicAdvertisingSyncEstablishedV1.parse(buffer);

    if ("error" in result) {
      assert.fail(`unexpected error: ${result.error}`);
    }

    assert.strictEqual(result.syncHandle, 0x0001);
    assert.strictEqual(result.advertisingSid, 0x02);
    assert.strictEqual(result.advertiserAddress.toString(), Address.from(0x060504030201, 0x00).toString());
    assert.strictEqual(result.advertiserPhy, 0x01);
    assert.strictEqual(result.periodicAdvertisingIntervalMs, 800 * 1.25);
    assert.strictEqual(result.advertiserClockAccuracy, 0x01);
  });

  it("should parse a valid buffer with error status", () => {
    const buffer = Buffer.from([0x01]); // Status: Unknown HCI Command

    const result = LePeriodicAdvertisingSyncEstablishedV1.parse(buffer);
    if (!("error" in result)) {
      assert.fail("expected error");
    }

    assert.strictEqual(result.error, HciErrorErrno.UnknownCommand);
  });

  it("should throw an error for invalid buffer length", () => {
    const buffer = Buffer.from([0x00, 0x01, 0x00]); // Incomplete buffer

    assert.throws(() => {
      LePeriodicAdvertisingSyncEstablishedV1.parse(buffer);
    }, /invalid size/);
  });
});
