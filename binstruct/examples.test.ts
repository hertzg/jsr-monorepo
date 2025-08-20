import { assertEquals } from "@std/assert";
import { array, bytes, ref, struct } from "./mod.ts";
import { s32be, u16be, u32be, u8be } from "./numeric/numeric.ts";

Deno.test("PacketHead, TLV, and HelloReply datastructure", () => {
  const tlvLengthCoder = u16be();
  const tlvCoder = struct({
    type: u16be(),
    length: tlvLengthCoder,
    value: bytes(ref(tlvLengthCoder)), // length-prefixed string using the length field
  });

  const helloReplyCoder = struct({
    version: u8be(),
    opcode: u8be(),
    smac: array(u8be(), 6), // MAC address is 6 bytes
    dmac: array(u8be(), 6), // MAC address is 6 bytes
    sequence: u16be(),
    errCode: s32be(),
    length: u16be(),
    offset: u16be(),
    flag: u16be(),
    tokenId: u16be(),
    reserved: u32be(),
    tlvs: array(tlvCoder, 13), // Fixed length array with exactly 13 TLVs
  });

  // Create anonymized test data maintaining the same structure
  const testData = {
    version: 1,
    opcode: 2,
    smac: [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC], // Anonymized source MAC
    dmac: [0x00, 0x11, 0x22, 0x33, 0x44, 0x55], // Anonymized destination MAC
    sequence: 0x0216,
    errCode: 0,
    length: 0x00B5,
    offset: 0,
    flag: 0,
    tokenId: 0,
    reserved: 0,
    tlvs: [
      {
        type: 1,
        length: 11,
        value: new Uint8Array([
          0x4E,
          0x58,
          0x2D,
          0x44,
          0x45,
          0x56,
          0x31,
          0x32,
          0x33,
          0x34,
          0x35,
        ]), // Device model: "NX-DEV12345"
      },
      {
        type: 2,
        length: 7,
        value: new Uint8Array([0x54, 0x45, 0x53, 0x54, 0x2D, 0x44, 0x56]), // Device name: "TEST-DV"
      },
      {
        type: 3,
        length: 6,
        value: new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]), // Serial number (anonymized)
      },
      {
        type: 7,
        length: 30,
        value: new Uint8Array([
          0x31,
          0x2E,
          0x30,
          0x2E,
          0x30,
          0x20,
          0x42,
          0x75,
          0x69,
          0x6C,
          0x64,
          0x20,
          0x32,
          0x30,
          0x32,
          0x34,
          0x30,
          0x31,
          0x30,
          0x31,
          0x20,
          0x52,
          0x65,
          0x6C,
          0x2E,
          0x31,
          0x30,
          0x30,
          0x30,
          0x30,
        ]), // Firmware version: "1.0.0 Build 20240101 Rel.10000"
      },
      {
        type: 8,
        length: 15,
        value: new Uint8Array([
          0x4E,
          0x58,
          0x2D,
          0x44,
          0x45,
          0x56,
          0x31,
          0x32,
          0x33,
          0x34,
          0x35,
          0x20,
          0x31,
          0x2E,
          0x30,
        ]), // Hardware version: "NX-DEV12345 1.0"
      },
      {
        type: 0x0101,
        length: 4,
        value: new Uint8Array([0x00, 0x04, 0x0A, 0x00]), // IP config (anonymized)
      },
      {
        type: 0x0096,
        length: 8,
        value: new Uint8Array([0x00, 0x05, 0x00, 0x04, 0xFF, 0xFF, 0xFF, 0x00]), // Network mask
      },
      {
        type: 6,
        length: 4,
        value: new Uint8Array([0x0A, 0x00, 0x01, 0x01]), // IP address: 10.0.1.1
      },
      {
        type: 13,
        length: 1,
        value: new Uint8Array([0x01]), // Config flag
      },
      {
        type: 14,
        length: 1,
        value: new Uint8Array([0x00]), // Status flag
      },
      {
        type: 15,
        length: 4,
        value: new Uint8Array([0x00, 0x1C, 0x00, 0x00]), // Port config
      },
      {
        type: 16,
        length: 1,
        value: new Uint8Array([0x01]), // Feature flag
      },
      {
        type: 0xFFFF,
        length: 0,
        value: new Uint8Array([]), // End marker
      },
    ],
  };

  // Test encoding
  const buffer = new Uint8Array(1024);
  const bytesWritten = helloReplyCoder.encode(testData, buffer);

  // Test decoding
  const [decoded, bytesRead] = helloReplyCoder.decode(buffer);

  // Verify the data matches
  assertEquals(
    decoded.version,
    testData.version,
    "Version should match",
  );
  assertEquals(
    decoded.opcode,
    testData.opcode,
    "Opcode should match",
  );
  assertEquals(
    decoded.smac,
    testData.smac,
    "Source MAC should match",
  );
  assertEquals(
    decoded.dmac,
    testData.dmac,
    "Destination MAC should match",
  );
  assertEquals(
    decoded.sequence,
    testData.sequence,
    "Sequence should match",
  );
  assertEquals(
    decoded.errCode,
    testData.errCode,
    "Error code should match",
  );
  assertEquals(
    decoded.length,
    testData.length,
    "Length should match",
  );
  assertEquals(
    decoded.offset,
    testData.offset,
    "Offset should match",
  );
  assertEquals(decoded.flag, testData.flag, "Flag should match");
  assertEquals(
    decoded.tokenId,
    testData.tokenId,
    "Token ID should match",
  );
  assertEquals(
    decoded.reserved,
    testData.reserved,
    "Reserved should match",
  );

  // Verify TLV data
  assertEquals(
    decoded.tlvs.length,
    testData.tlvs.length,
    "Number of TLVs should match",
  );

  for (let i = 0; i < testData.tlvs.length; i++) {
    assertEquals(
      decoded.tlvs[i].type,
      testData.tlvs[i].type,
      `TLV ${i} type should match`,
    );
    assertEquals(
      decoded.tlvs[i].length,
      testData.tlvs[i].length,
      `TLV ${i} length should match`,
    );
    assertEquals(
      decoded.tlvs[i].value,
      testData.tlvs[i].value,
      `TLV ${i} value should match`,
    );
  }

  // Verify encoding/decoding integrity
  assertEquals(
    bytesWritten,
    bytesRead,
    "Bytes written should equal bytes read",
  );

  // Verify the complete structure round-trips correctly
  assertEquals(
    decoded,
    testData,
    "Complete structure should round-trip correctly",
  );
});
