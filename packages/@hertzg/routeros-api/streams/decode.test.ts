import { assertEquals } from "@std/assert";
import { createApiDecodeStream } from "./decode.ts";
import { encodeSentence } from "../encoding/sentence.ts";
import type { Reply } from "../protocol/reply.ts";

async function decodeBytes(bytes: Uint8Array): Promise<Reply> {
  const stream = createApiDecodeStream();
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  writer.write(bytes);
  writer.close();

  const { value } = await reader.read();
  return value!;
}

Deno.test("createApiDecodeStream - !done reply", async () => {
  const bytes = encodeSentence(["!done"]);
  const result = await decodeBytes(bytes);

  assertEquals(result, { type: "done" });
});

Deno.test("createApiDecodeStream - !re reply", async () => {
  const bytes = encodeSentence([
    "!re",
    "=name=ether1",
    "=type=ether",
  ]);
  const result = await decodeBytes(bytes);

  assertEquals(result, {
    type: "re",
    attributes: {
      name: "ether1",
      type: "ether",
    },
  });
});

Deno.test("createApiDecodeStream - !trap reply", async () => {
  const bytes = encodeSentence([
    "!trap",
    "=message=no such item",
    "=category=2",
  ]);
  const result = await decodeBytes(bytes);

  assertEquals(result, {
    type: "trap",
    message: "no such item",
    category: 2,
  });
});

Deno.test("createApiDecodeStream - !fatal reply", async () => {
  const bytes = encodeSentence([
    "!fatal",
    "=message=connection lost",
  ]);
  const result = await decodeBytes(bytes);

  assertEquals(result, {
    type: "fatal",
    message: "connection lost",
  });
});

Deno.test("createApiDecodeStream - multiple replies", async () => {
  const replies = [
    ["!re", "=name=ether1"],
    ["!re", "=name=ether2"],
    ["!done"],
  ];

  // Encode all replies
  const allBytes = replies.map((words) => encodeSentence(words));
  const totalLength = allBytes.reduce((sum, b) => sum + b.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const bytes of allBytes) {
    combined.set(bytes, offset);
    offset += bytes.length;
  }

  // Decode
  const stream = createApiDecodeStream();
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  const writePromise = (async () => {
    await writer.write(combined);
    await writer.close();
  })();

  const results: Reply[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    results.push(value);
  }

  await writePromise;

  assertEquals(results.length, 3);
  assertEquals(results[0].type, "re");
  assertEquals(results[1].type, "re");
  assertEquals(results[2].type, "done");
});

Deno.test("createApiDecodeStream - chunked input", async () => {
  const bytes = encodeSentence(["!done", "=tag=req-1"]);

  // Split bytes into chunks
  const chunk1 = bytes.slice(0, 5);
  const chunk2 = bytes.slice(5);

  const stream = createApiDecodeStream();
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  const writePromise = (async () => {
    await writer.write(chunk1);
    await writer.write(chunk2);
    await writer.close();
  })();

  const { value } = await reader.read();

  await writePromise;

  assertEquals(value, {
    type: "done",
    attributes: { tag: "req-1" },
  });
});

Deno.test("createApiDecodeStream - multiple replies in chunks", async () => {
  const reply1 = encodeSentence(["!re", "=name=ether1"]);
  const reply2 = encodeSentence(["!done"]);

  const combined = new Uint8Array(reply1.length + reply2.length);
  combined.set(reply1, 0);
  combined.set(reply2, reply1.length);

  // Send in two chunks that don't align with sentence boundaries
  const chunk1 = combined.slice(0, reply1.length + 3);
  const chunk2 = combined.slice(reply1.length + 3);

  const stream = createApiDecodeStream();
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  const writePromise = (async () => {
    await writer.write(chunk1);
    await writer.write(chunk2);
    await writer.close();
  })();

  const results: Reply[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    results.push(value);
  }

  await writePromise;

  assertEquals(results.length, 2);
  assertEquals(results[0].type, "re");
  assertEquals(results[1].type, "done");
});

Deno.test("createApiDecodeStream - complex reply", async () => {
  const bytes = encodeSentence([
    "!re",
    "=.id=*1",
    "=name=ether1",
    "=type=ether",
    "=mtu=1500",
    "=disabled=false",
  ]);

  const result = await decodeBytes(bytes);

  assertEquals(result, {
    type: "re",
    attributes: {
      ".id": "*1",
      name: "ether1",
      type: "ether",
      mtu: "1500",
      disabled: "false",
    },
  });
});
