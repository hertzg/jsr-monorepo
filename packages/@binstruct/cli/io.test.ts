/**
 * Tests for the I/O utilities.
 */

import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
  readStdin,
  readStdinJson,
  writeStdout,
  writeStdoutJson,
} from "./io.ts";

/** This module, for the subprocess that owns a real stdout. */
const IO = import.meta.resolve("./io.ts");

/** The workspace config, so the subprocess resolves the same bare imports. */
const CONFIG = fromFileUrl(import.meta.resolve("../../../deno.json"));

/**
 * Pipes bytes through a subprocess that reads stdin and writes stdout.
 *
 * A real stdout is the only place the line buffering shows, and the test
 * process cannot lend out its own, so the pair runs in a child.
 *
 * @param input Bytes to feed the child's stdin
 * @returns Everything the child wrote to stdout
 */
async function throughStdio(input: Uint8Array): Promise<Uint8Array> {
  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "eval",
      "--config",
      CONFIG,
      `import { readStdin, writeStdout } from "${IO}";` +
      "await writeStdout(await readStdin());",
    ],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });

  const child = command.spawn();
  const writer = child.stdin.getWriter();
  await writer.write(input);
  await writer.close();

  const output = await child.output();
  assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));

  return output.stdout;
}

Deno.test("readStdin function exists and is callable", () => {
  assertEquals(typeof readStdin, "function");
});

Deno.test("readStdinJson function exists and is callable", () => {
  assertEquals(typeof readStdinJson, "function");
});

Deno.test("writeStdout function exists and is callable", () => {
  assertEquals(typeof writeStdout, "function");
});

Deno.test("writeStdoutJson function exists and is callable", () => {
  assertEquals(typeof writeStdoutJson, "function");
});

Deno.test("writeStdout writes every byte past the last newline", async () => {
  // Stdout is line buffered, so a single write takes everything up to and
  // including the last 0x0a plus a remainder of at most 1023 bytes. What
  // decides whether the tail survives is how far that newline sits from the
  // end, not how long the payload is: this one leaves 3095 bytes after it.
  const payload = new Uint8Array(4096).fill(0x41);
  payload[1000] = 0x0a;

  assertEquals(await throughStdio(payload), payload);
});
