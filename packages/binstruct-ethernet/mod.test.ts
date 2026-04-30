import { assertEquals } from "@std/assert";
import { refine } from "@hertzg/binstruct";
import { parse as parseMac, stringify as stringifyMac } from "@hertzg/mac";
import { ethernet2Frame, type Ethernet2Frame } from "./mod.ts";

const MAC_ADDRESS_LENGTH = 6;
const ETHER_TYPE_LENGTH = 2;
const ETHERNET_FRAME_OVERHEAD = MAC_ADDRESS_LENGTH * 2 + ETHER_TYPE_LENGTH;

function assertBytesReadAndWritten(
  bytesWritten: number,
  bytesRead: number,
  buffer: Uint8Array,
  payload: Uint8Array,
) {
  assertEquals(bytesRead, buffer.length);
  assertEquals(bytesWritten, ETHERNET_FRAME_OVERHEAD + payload.length);
}

function assertPayloadEquals(actual: Uint8Array, expected: Uint8Array) {
  assertEquals(actual.slice(0, expected.length), expected);
}

Deno.test("ethernet2Frame: basic encode/decode", () => {
  const frameCoder = ethernet2Frame();
  const frame = {
    dstMac: new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
    srcMac: new Uint8Array([0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb]),
    etherType: 0x0800,
    payload: new Uint8Array([0x45, 0x00, 0x00, 0x14]),
  } as Ethernet2Frame;

  const buffer = new Uint8Array(1500);
  const bytesWritten = frameCoder.encode(frame, buffer);
  const [decoded, bytesRead] = frameCoder.decode(buffer);

  assertBytesReadAndWritten(bytesWritten, bytesRead, buffer, frame.payload);
  assertEquals(decoded.dstMac, frame.dstMac);
  assertEquals(decoded.srcMac, frame.srcMac);
  assertEquals(decoded.etherType, frame.etherType);
  assertPayloadEquals(decoded.payload, frame.payload);
});

Deno.test("ethernet2Frame: broadcast and zero MACs", () => {
  const frameCoder = ethernet2Frame();
  const frame: Ethernet2Frame = {
    dstMac: new Uint8Array(6).fill(0xff),
    srcMac: new Uint8Array(6),
    etherType: 0x0800,
    payload: new Uint8Array([0x01]),
  };

  const buffer = new Uint8Array(1500);
  const bytesWritten = frameCoder.encode(frame, buffer);
  const [decoded, bytesRead] = frameCoder.decode(buffer);

  assertBytesReadAndWritten(bytesWritten, bytesRead, buffer, frame.payload);
  assertEquals(decoded.dstMac, frame.dstMac);
  assertEquals(decoded.srcMac, frame.srcMac);
});

Deno.test("ethernet2Frame: integration with @hertzg/mac string addresses", () => {
  const frameCoder = ethernet2Frame();
  const dstMacString = "00:11:22:33:44:55";
  const srcMacString = "66:77:88:99:aa:bb";

  const frame: Ethernet2Frame = {
    dstMac: parseMac(dstMacString),
    srcMac: parseMac(srcMacString),
    etherType: 0x0800,
    payload: new Uint8Array([0x45, 0x00, 0x00, 0x14]),
  };

  const buffer = new Uint8Array(1500);
  const bytesWritten = frameCoder.encode(frame, buffer);
  const [decoded, bytesRead] = frameCoder.decode(buffer);

  assertBytesReadAndWritten(bytesWritten, bytesRead, buffer, frame.payload);
  assertEquals(stringifyMac(decoded.dstMac), dstMacString);
  assertEquals(stringifyMac(decoded.srcMac), srcMacString);
});

Deno.test("ethernet2Frame: refined to string-MAC variant", () => {
  type StringMacFrame = Omit<Ethernet2Frame, "dstMac" | "srcMac"> & {
    dstMac: string;
    srcMac: string;
  };

  const stringMacFrame = refine(ethernet2Frame(), {
    refine: (frame: Ethernet2Frame): StringMacFrame => ({
      ...frame,
      dstMac: stringifyMac(frame.dstMac),
      srcMac: stringifyMac(frame.srcMac),
    }),
    unrefine: (frame: StringMacFrame): Ethernet2Frame => ({
      ...frame,
      dstMac: parseMac(frame.dstMac),
      srcMac: parseMac(frame.srcMac),
    }),
  });

  const coder = stringMacFrame();
  const frame: StringMacFrame = {
    dstMac: "00:11:22:33:44:55",
    srcMac: "66:77:88:99:aa:bb",
    etherType: 0x0800,
    payload: new Uint8Array([0x45, 0x00, 0x00, 0x14]),
  };

  const buffer = new Uint8Array(1500);
  const bytesWritten = coder.encode(frame, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertBytesReadAndWritten(bytesWritten, bytesRead, buffer, frame.payload);
  assertEquals(decoded.dstMac, frame.dstMac);
  assertEquals(decoded.srcMac, frame.srcMac);
  assertEquals(decoded.etherType, frame.etherType);
  assertPayloadEquals(decoded.payload, frame.payload);
});
