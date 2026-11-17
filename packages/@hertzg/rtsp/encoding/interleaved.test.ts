import { test } from "node:test";
import { assertEquals } from "@std/assert";
import {
  decodeInterleavedBinaryData,
  encodeInterleavedBinaryData,
  isInterleavedBinaryData,
} from "./interleaved.ts";

test("encodeInterleavedBinaryData writes $, Channel ID, Length in network order, then the data", () => {
  const octets = encodeInterleavedBinaryData({
    channelId: 3,
    binaryData: new Uint8Array([0xaa, 0xbb, 0xcc]),
  });

  // deno-fmt-ignore
  assertEquals(octets, new Uint8Array([
    0x24, 0x03, 0x00, 0x03,
    0xaa, 0xbb, 0xcc,
  ]));
});

test("encodeInterleavedBinaryData puts the high Length octet first", () => {
  const octets = encodeInterleavedBinaryData({
    channelId: 0,
    binaryData: new Uint8Array(0x0102),
  });

  assertEquals(octets.subarray(0, 4), new Uint8Array([0x24, 0x00, 0x01, 0x02]));
});

test("a block round-trips through encode and decode", () => {
  const octets = encodeInterleavedBinaryData({
    channelId: 255,
    binaryData: new Uint8Array([0x80, 0x60, 0x12, 0x34]),
  });

  assertEquals(decodeInterleavedBinaryData(octets), [
    { channelId: 255, binaryData: new Uint8Array([0x80, 0x60, 0x12, 0x34]) },
    8,
  ]);
});

test("a block with Length 0 round-trips as 4 octets", () => {
  const octets = encodeInterleavedBinaryData({
    channelId: 7,
    binaryData: new Uint8Array(),
  });

  assertEquals(octets, new Uint8Array([0x24, 0x07, 0x00, 0x00]));
  assertEquals(decodeInterleavedBinaryData(octets), [
    { channelId: 7, binaryData: new Uint8Array() },
    4,
  ]);
});

test("a block with Length 65535 round-trips", () => {
  const octets = encodeInterleavedBinaryData({
    channelId: 1,
    binaryData: new Uint8Array(65535).fill(0x5a),
  });

  assertEquals(octets.subarray(0, 4), new Uint8Array([0x24, 0x01, 0xff, 0xff]));
  assertEquals(decodeInterleavedBinaryData(octets), [
    { channelId: 1, binaryData: new Uint8Array(65535).fill(0x5a) },
    65539,
  ]);
});

test("decodeInterleavedBinaryData returns undefined for an incomplete header", () => {
  const octets = new Uint8Array([0x24, 0x01, 0x00, 0x00]);

  assertEquals(decodeInterleavedBinaryData(octets.subarray(0, 0)), undefined);
  assertEquals(decodeInterleavedBinaryData(octets.subarray(0, 1)), undefined);
  assertEquals(decodeInterleavedBinaryData(octets.subarray(0, 2)), undefined);
  assertEquals(decodeInterleavedBinaryData(octets.subarray(0, 3)), undefined);
});

test("decodeInterleavedBinaryData returns undefined for incomplete binary data", () => {
  // deno-fmt-ignore
  const octets = new Uint8Array([
    0x24, 0x01, 0x00, 0x03,
    0xaa, 0xbb, 0xcc,
  ]);

  assertEquals(decodeInterleavedBinaryData(octets.subarray(0, 4)), undefined);
  assertEquals(decodeInterleavedBinaryData(octets.subarray(0, 6)), undefined);
});

test("decodeInterleavedBinaryData stops at the end of the block", () => {
  // deno-fmt-ignore
  const octets = new Uint8Array([
    0x24, 0x02, 0x00, 0x02,
    0xaa, 0xbb,
    0x24, 0x09, 0x00, 0x01, 0xff,
  ]);

  assertEquals(decodeInterleavedBinaryData(octets), [
    { channelId: 2, binaryData: new Uint8Array([0xaa, 0xbb]) },
    6,
  ]);
});

test("decodeInterleavedBinaryData reads a subarray from its own offset", () => {
  // deno-fmt-ignore
  const buffer = new Uint8Array([
    0x24, 0x09, 0x00, 0x01, 0xff,
    0x24, 0x04, 0x00, 0x02, 0xc1, 0xc2,
    0xee,
  ]);

  assertEquals(decodeInterleavedBinaryData(buffer.subarray(5)), [
    { channelId: 4, binaryData: new Uint8Array([0xc1, 0xc2]) },
    6,
  ]);
});

test("decodeInterleavedBinaryData returns a copy of the binary data", () => {
  const octets = new Uint8Array([0x24, 0x00, 0x00, 0x02, 0x11, 0x22]);

  const [data] = decodeInterleavedBinaryData(octets)!;
  octets.fill(0);

  assertEquals(data.binaryData, new Uint8Array([0x11, 0x22]));
});

test("isInterleavedBinaryData accepts a block", () => {
  assertEquals(
    isInterleavedBinaryData({ channelId: 0, binaryData: new Uint8Array() }),
    true,
  );
});

test("isInterleavedBinaryData rejects RTSP messages and non-objects", () => {
  const request = {
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(),
  };
  const response = {
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [],
    messageBody: new Uint8Array(),
  };

  assertEquals(isInterleavedBinaryData(request), false);
  assertEquals(isInterleavedBinaryData(response), false);
  assertEquals(isInterleavedBinaryData(undefined), false);
  assertEquals(isInterleavedBinaryData(null), false);
  assertEquals(isInterleavedBinaryData("$"), false);
});

test("isInterleavedBinaryData rejects a block-shaped object with wrong field types", () => {
  assertEquals(
    isInterleavedBinaryData({ channelId: "0", binaryData: new Uint8Array() }),
    false,
  );
  assertEquals(
    isInterleavedBinaryData({ channelId: 0, binaryData: [0x80] }),
    false,
  );
});
