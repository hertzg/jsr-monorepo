/**
 * Tests for the I/O utilities.
 */

import { assertEquals } from "@std/assert";
import {
  readStdin,
  readStdinJson,
  writeStdout,
  writeStdoutJson,
} from "./io.ts";

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
