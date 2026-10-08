import { assertEquals, assertThrows } from "@std/assert";
import { aesCfbEncrypt, xorCipher } from "../encoding/cipher.ts";
import { createMessage, decryptBody } from "./message.ts";

Deno.test("createMessage builds a 24-byte request by default", () => {
  const body = Uint8Array.of(1, 2, 3);

  assertEquals(
    createMessage({ cmdId: 1, channelId: 250, messageId: 2, body }),
    {
      header: {
        cmdId: 1,
        bodyLength: 3,
        channelId: 250,
        messageId: 2,
        status: 0,
        messageClass: 0x1464,
        payloadOffset: 0,
      },
      body: Uint8Array.of(1, 2, 3),
      payload: new Uint8Array(0),
    },
  );
});

Deno.test("createMessage builds the 20-byte nonce request", () => {
  assertEquals(
    createMessage({
      cmdId: 1,
      channelId: 250,
      messageId: 1,
      messageClass: 0x1465,
    }).header,
    {
      cmdId: 1,
      bodyLength: 0,
      channelId: 250,
      messageId: 1,
      encryption: 0xdc12,
      messageClass: 0x1465,
    },
  );
});

Deno.test("decryptBody returns an empty string for an empty body", () => {
  const message = createMessage({ cmdId: 31, channelId: 251, messageId: 3 });

  assertEquals(decryptBody(message), "");
});

Deno.test("decryptBody uses AES for a 24-byte push when a key is given", () => {
  const key = new TextEncoder().encode("08822D7143979103");
  const xml = '<?xml version="1.0" ?><body><AlarmEventList/></body>';
  const message = createMessage({
    cmdId: 33,
    channelId: 251,
    messageId: 0,
    body: aesCfbEncrypt(key, new TextEncoder().encode(xml)),
  });

  assertEquals(decryptBody(message, key), xml);
});

Deno.test("decryptBody falls back to XOR for a 24-byte login reply", () => {
  const key = new TextEncoder().encode("08822D7143979103");
  const xml = '<?xml version="1.0" ?><body><DeviceInfo/></body>';
  const message = createMessage({
    cmdId: 1,
    channelId: 250,
    messageId: 2,
    body: xorCipher(new TextEncoder().encode(xml), 250),
  });

  assertEquals(decryptBody(message, key), xml);
});

Deno.test("decryptBody reads a plain body marked 00 dd", () => {
  const xml = '<?xml version="1.0" ?><body/>';
  const body = new TextEncoder().encode(xml);

  assertEquals(
    decryptBody({
      header: {
        cmdId: 1,
        bodyLength: body.length,
        channelId: 250,
        messageId: 1,
        encryption: 0xdd00,
        messageClass: 0x1466,
      },
      body,
      payload: new Uint8Array(0),
    }),
    xml,
  );
});

Deno.test("decryptBody throws when nothing yields XML", () => {
  const message = createMessage({
    cmdId: 33,
    channelId: 251,
    messageId: 0,
    body: Uint8Array.of(0xde, 0xad, 0xbe, 0xef, 0x00),
  });

  assertThrows(() => decryptBody(message), Error, "cmd 33");
});
