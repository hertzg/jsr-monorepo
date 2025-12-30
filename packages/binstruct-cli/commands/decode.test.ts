/**
 * Tests for the decode command implementation.
 */

import { assertEquals } from "@std/assert";
import { loadCoder } from "../loader.ts";

Deno.test("loadCoder with valid JSR package", async () => {
  // Mock the import to return a valid coder
  const originalImport = (globalThis as Record<string, unknown>).import;
  (globalThis as Record<string, unknown>).import = (specifier: string) => {
    if (specifier === "jsr:@binstruct/png") {
      return Promise.resolve({
        pngFile: () => ({
          decode: (data: Uint8Array) => [data, data.length],
          encode: (_value: unknown, _buffer: Uint8Array) => 0,
        }),
      });
    }
    return Promise.reject(new Error("Module not found"));
  };

  try {
    const coder = await loadCoder("jsr:@binstruct/png", "pngFile");
    assertEquals(typeof coder.decode, "function");
    assertEquals(typeof coder.encode, "function");
  } finally {
    (globalThis as Record<string, unknown>).import = originalImport;
  }
});
