import { assertEquals } from "@std/assert";
import { createApiEncodeStream } from "./encode.ts";
import type { Command } from "../protocol/command.ts";

async function encodeCommand(cmd: Command): Promise<Uint8Array> {
  const stream = createApiEncodeStream();
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  writer.write(cmd);
  writer.close();

  const { value } = await reader.read();
  return value!;
}

Deno.test("createApiEncodeStream - simple command", async () => {
  const cmd: Command = { command: "/login" };
  const result = await encodeCommand(cmd);

  // Should encode: ["/login", terminator]
  // Length 6 + "/login" bytes + terminator
  assertEquals(result[0], 0x06); // length of "/login"
  assertEquals(result[result.length - 1], 0x00); // terminator
});

Deno.test("createApiEncodeStream - command with attributes", async () => {
  const cmd: Command = {
    command: "/login",
    attributes: { name: "admin", password: "secret" },
  };
  const result = await encodeCommand(cmd);

  // Should contain all words plus terminator
  assertEquals(result[result.length - 1], 0x00); // terminator
  // First word should be "/login"
  assertEquals(result[0], 0x06);
});

Deno.test("createApiEncodeStream - command with queries", async () => {
  const cmd: Command = {
    command: "/interface/print",
    queries: { type: "ether" },
  };
  const result = await encodeCommand(cmd);

  assertEquals(result[result.length - 1], 0x00); // terminator
});

Deno.test("createApiEncodeStream - multiple commands", async () => {
  const commands: Command[] = [
    { command: "/login", attributes: { name: "admin", password: "secret" } },
    { command: "/interface/print" },
    { command: "/quit" },
  ];

  const stream = createApiEncodeStream();
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  // Write and read in parallel
  const writePromise = (async () => {
    for (const cmd of commands) {
      await writer.write(cmd);
    }
    await writer.close();
  })();

  // Read all results
  const results: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    results.push(value);
  }

  await writePromise;

  assertEquals(results.length, 3);
  // Each should end with terminator
  for (const result of results) {
    assertEquals(result[result.length - 1], 0x00);
  }
});

Deno.test("createApiEncodeStream - empty attributes/queries", async () => {
  const cmd: Command = {
    command: "/interface/print",
    attributes: {},
    queries: {},
  };
  const result = await encodeCommand(cmd);

  // Should just encode the command
  assertEquals(result[0], 0x10); // length of "/interface/print" (16 characters)
  assertEquals(result[result.length - 1], 0x00);
});

Deno.test("createApiEncodeStream - complex command", async () => {
  const cmd: Command = {
    command: "/interface/vlan/add",
    attributes: {
      name: "vlan10",
      "vlan-id": 10,
      interface: "ether1",
      disabled: false,
    },
  };
  const result = await encodeCommand(cmd);

  assertEquals(result[result.length - 1], 0x00);
  // Should contain multiple words
  // First word is the command
  assertEquals(result[0], 0x13); // length of "/interface/vlan/add"
});
