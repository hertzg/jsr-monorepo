import { assertEquals, assertThrows } from "@std/assert";
import { decodeHex } from "@std/encoding/hex";
import { decode, encode } from "@hertzg/binstruct";
import { baichuanHeader, headerLength } from "./header.ts";

Deno.test("baichuanHeader encodes the 20-byte nonce request", () => {
  const bytes = encode(baichuanHeader(), {
    cmdId: 1,
    bodyLength: 0,
    channelId: 250,
    messageId: 1,
    code: 0xdc12,
    messageClass: 0x1465,
  });

  assertEquals(bytes, decodeHex("f0debc0a0100000000000000fa01000012dc1465"));
});

Deno.test("baichuanHeader encodes the 24-byte subscribe request", () => {
  const bytes = encode(baichuanHeader(), {
    cmdId: 31,
    bodyLength: 0,
    channelId: 251,
    messageId: 3,
    code: 0,
    messageClass: 0x1464,
    payloadOffset: 0,
  });

  assertEquals(
    bytes,
    decodeHex("f0debc0a1f00000000000000fb0300000000146400000000"),
  );
});

Deno.test("baichuanHeader decodes a 24-byte reply with a status code", () => {
  const [header, bytesRead] = baichuanHeader().decode(
    decodeHex("f0debc0a2100000010010000fb563412c8001464a0000000"),
  );

  assertEquals(header, {
    cmdId: 33,
    bodyLength: 272,
    channelId: 251,
    messageId: 0x123456,
    code: 200,
    messageClass: 0x1464,
    payloadOffset: 160,
  });
  assertEquals(bytesRead, 24);
});

Deno.test("baichuanHeader decodes a 20-byte reply without a payload offset", () => {
  const [header, bytesRead] = baichuanHeader().decode(
    decodeHex("f0debc0a0100000040000000fa01000001dd1466"),
  );

  assertEquals(header, {
    cmdId: 1,
    bodyLength: 64,
    channelId: 250,
    messageId: 1,
    code: 0xdd01,
    messageClass: 0x1466,
  });
  assertEquals(bytesRead, 20);
});

Deno.test("baichuanHeader round-trips the largest message id", () => {
  const header = {
    cmdId: 93,
    bodyLength: 0,
    channelId: 250,
    messageId: 0xffffff,
    code: 0,
    messageClass: 0x1464,
    payloadOffset: 0,
  };

  assertEquals(
    decode(baichuanHeader(), encode(baichuanHeader(), header)),
    header,
  );
});

Deno.test("baichuanHeader rejects bytes without the magic", () => {
  assertThrows(
    () =>
      baichuanHeader().decode(
        decodeHex("deadbeef0100000000000000fa01000012dc1465"),
      ),
    Error,
    "magic",
  );
});

Deno.test("headerLength is 24 for classes that carry a payload offset", () => {
  assertEquals(headerLength(0x1464), 24);
  assertEquals(headerLength(0x0000), 24);
});

Deno.test("headerLength is 20 for the other classes", () => {
  assertEquals(headerLength(0x1465), 20);
  assertEquals(headerLength(0x1466), 20);
});
