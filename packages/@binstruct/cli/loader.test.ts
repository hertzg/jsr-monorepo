/**
 * Tests for the loader utilities.
 *
 * `loadCoder` forwards its argument to dynamic `import()`, which resolves
 * nothing through a mock and everything through the module graph — so these
 * point at real modules in this repository, and need no network.
 */

import { assertEquals, assertRejects } from "@std/assert";
import { loadCoder } from "./loader.ts";

/** A package exporting exactly one coder factory, `arpData`. */
const ARP = import.meta.resolve("../arp/mod.ts");

Deno.test("loadCoder calls the factory and returns its coder", async () => {
  const coder = await loadCoder(ARP, "arpData");

  assertEquals(typeof coder.decode, "function");
  assertEquals(typeof coder.encode, "function");
});

Deno.test("loadCoder rejects a name the package does not export", async () => {
  const error = await assertRejects(
    () => loadCoder(ARP, "arpDatum"),
    Error,
    "not found in package",
  );

  assertEquals(error.message.includes("arpData"), true);
});

Deno.test("loadCoder rejects an export that is not a factory", async () => {
  await assertRejects(
    () => loadCoder(import.meta.resolve("./registry.ts"), "KNOWN_PACKAGES"),
    Error,
    "is not a function",
  );
});

Deno.test("loadCoder rejects a package that cannot be resolved", async () => {
  await assertRejects(() =>
    loadCoder(import.meta.resolve("./no-such-module.ts"), "anything")
  );
});
