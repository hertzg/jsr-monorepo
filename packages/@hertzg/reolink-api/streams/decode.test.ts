import { assertEquals, assertRejects } from "@std/assert";
import { decodeHex } from "@std/encoding/hex";
import { createBaichuanDecodeStream } from "./decode.ts";

Deno.test("createBaichuanDecodeStream reassembles a message split byte by byte", async () => {
  const bytes = decodeHex(
    "f0debc0a0100000003000000fa01000001dd1466" + "aabbcc",
  );

  const messages = await Array.fromAsync(
    ReadableStream.from(Array.from(bytes, (byte) => Uint8Array.of(byte)))
      .pipeThrough(createBaichuanDecodeStream()),
  );

  assertEquals(messages, [{
    header: {
      cmdId: 1,
      bodyLength: 3,
      channelId: 250,
      messageId: 1,
      code: 0xdd01,
      messageClass: 0x1466,
    },
    body: Uint8Array.of(0xaa, 0xbb, 0xcc),
    payload: new Uint8Array(0),
  }]);
});

Deno.test("createBaichuanDecodeStream splits the payload at payloadOffset", async () => {
  const bytes = decodeHex(
    "f0debc0a0300000005000000010700000000146402000000" + "aabb" + "ccddee",
  );

  const [message] = await Array.fromAsync(
    ReadableStream.from([bytes]).pipeThrough(createBaichuanDecodeStream()),
  );

  assertEquals(message.body, Uint8Array.of(0xaa, 0xbb));
  assertEquals(message.payload, Uint8Array.of(0xcc, 0xdd, 0xee));
});

Deno.test("createBaichuanDecodeStream reads messages joined across chunks", async () => {
  const first = decodeHex("f0debc0a1f00000000000000fb030000c800146400000000");
  const second = decodeHex("f0debc0a5d00000000000000fa040000c800146400000000");
  const joined = new Uint8Array([...first, ...second]);

  const messages = await Array.fromAsync(
    ReadableStream.from([joined.subarray(0, 30), joined.subarray(30)])
      .pipeThrough(createBaichuanDecodeStream()),
  );

  assertEquals(messages.map((message) => message.header.cmdId), [31, 93]);
});

Deno.test("createBaichuanDecodeStream errors on a missing magic", async () => {
  const bytes = decodeHex("deadbeef1f00000000000000fb030000c800146400000000");

  await assertRejects(
    () =>
      Array.fromAsync(
        ReadableStream.from([bytes]).pipeThrough(createBaichuanDecodeStream()),
      ),
    Error,
    "magic",
  );
});

Deno.test("createBaichuanDecodeStream errors when input ends mid-message", async () => {
  const bytes = decodeHex("f0debc0a0100000003000000fa01000001dd1466aa");

  await assertRejects(
    () =>
      Array.fromAsync(
        ReadableStream.from([bytes]).pipeThrough(createBaichuanDecodeStream()),
      ),
    Error,
    "21 bytes",
  );
});
