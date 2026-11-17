/**
 * Tests for the encode command implementation.
 */

import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { encodeCommand } from "./encode.ts";

test("encodeCommand function exists and is callable", () => {
  assertEquals(typeof encodeCommand, "function");
});
