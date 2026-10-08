import { assertEquals } from "@std/assert";
import { decodeHex } from "@std/encoding/hex";
import { createMessage } from "../protocol/message.ts";
import { createBaichuanDecodeStream } from "./decode.ts";
import { createBaichuanEncodeStream } from "./encode.ts";

Deno.test("createBaichuanEncodeStream writes header and body as one chunk", async () => {
  const chunks = await Array.fromAsync(
    ReadableStream.from([
      createMessage({
        cmdId: 1,
        channelId: 250,
        messageId: 2,
        body: Uint8Array.of(0xaa, 0xbb),
      }),
    ]).pipeThrough(createBaichuanEncodeStream()),
  );

  assertEquals(chunks, [
    decodeHex("f0debc0a0100000002000000fa0200000000146400000000aabb"),
  ]);
});

Deno.test("createBaichuanEncodeStream output decodes to the same messages", async () => {
  const messages = [
    createMessage({
      cmdId: 1,
      channelId: 250,
      messageId: 1,
      messageClass: 0x1465,
    }),
    createMessage({
      cmdId: 1,
      channelId: 250,
      messageId: 2,
      body: Uint8Array.of(1, 2, 3),
    }),
    createMessage({ cmdId: 31, channelId: 251, messageId: 3 }),
  ];

  const decoded = await Array.fromAsync(
    ReadableStream.from(messages)
      .pipeThrough(createBaichuanEncodeStream())
      .pipeThrough(createBaichuanDecodeStream()),
  );

  assertEquals(decoded, messages);
});
