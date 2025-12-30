/**
 * Tests for the main module exports.
 */

import { assertEquals } from "@std/assert";
import { main } from "./mod.ts";

Deno.test("main function is exported", () => {
  assertEquals(typeof main, "function");
});

Deno.test("main function is async", () => {
  const result = main(["-h"]); // Use help flag to avoid exit
  assertEquals(result instanceof Promise, true);
});
