/**
 * Tests for the encode command implementation.
 */

import { assertEquals } from "@std/assert";
import { encodeCommand } from "./encode.ts";

Deno.test("encodeCommand function exists and is callable", () => {
  assertEquals(typeof encodeCommand, "function");
});
