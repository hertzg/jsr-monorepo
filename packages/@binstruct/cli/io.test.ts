/**
 * Tests for the I/O utilities.
 */

import { spawn } from "node:child_process";
import { once } from "node:events";
import { execPath } from "node:process";
import { buffer, text } from "node:stream/consumers";
import { test } from "node:test";
import { assertEquals } from "@std/assert";
import {
  readStdin,
  readStdinJson,
  writeStdout,
  writeStdoutJson,
} from "./io.ts";

/** This module, for the subprocess that owns a real stdout. */
const IO = import.meta.resolve("./io.ts");

/**
 * Pipes bytes through a subprocess that reads stdin and writes stdout.
 *
 * A real stdout is the only place a partial write shows, and the test process
 * cannot lend out its own, so the pair runs in a child.
 *
 * @param input Bytes to feed the child's stdin
 * @returns Everything the child wrote to stdout
 */
async function throughStdio(input: Uint8Array): Promise<Uint8Array> {
  const child = spawn(execPath, [
    "--eval",
    `import { readStdin, writeStdout } from "${IO}";` +
    "await writeStdout(await readStdin());",
  ], { stdio: ["pipe", "pipe", "pipe"] });

  child.stdin.end(input);

  const [stdout, stderr, [code]] = await Promise.all([
    buffer(child.stdout),
    text(child.stderr),
    once(child, "close"),
  ]);
  assertEquals(code, 0, stderr);

  return new Uint8Array(stdout);
}

test("readStdin function exists and is callable", () => {
  assertEquals(typeof readStdin, "function");
});

test("readStdinJson function exists and is callable", () => {
  assertEquals(typeof readStdinJson, "function");
});

test("writeStdout function exists and is callable", () => {
  assertEquals(typeof writeStdout, "function");
});

test("writeStdoutJson function exists and is callable", () => {
  assertEquals(typeof writeStdoutJson, "function");
});

test("writeStdout writes every byte past the last newline", async () => {
  // A line-buffered stdout takes a single write only up to and including the
  // last 0x0a plus a short remainder. What decides whether the tail survives
  // is how far that newline sits from the end, not how long the payload is:
  // this one leaves 3095 bytes after it.
  const payload = new Uint8Array(4096).fill(0x41);
  payload[1000] = 0x0a;

  assertEquals(await throughStdio(payload), payload);
});
