/**
 * Tests for the decode command implementation.
 */

import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { loadCoder } from "../loader.ts";

test("loadCoder with valid package", async () => {
  const coder = await loadCoder(
    import.meta.resolve("../../png/mod.ts"),
    "pngFile",
  );
  assertEquals(typeof coder.decode, "function");
  assertEquals(typeof coder.encode, "function");
});
