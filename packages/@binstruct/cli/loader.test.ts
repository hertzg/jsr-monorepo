/**
 * Tests for the loader utilities.
 *
 * `loadCoder` forwards its argument to dynamic `import()`, which resolves
 * nothing through a mock and everything through the module graph — so these
 * point at real modules in this repository, and need no network.
 */

import { assertEquals, assertRejects } from "@std/assert";
import { loadCoder, UnverifiedArityError } from "./loader.ts";

/** A package exporting exactly one coder factory, `arpData`. */
const ARP = import.meta.resolve("../arp/mod.ts");

/** A package with three zero-argument factories and `pcapFileWith`, which takes two. */
const PCAP = import.meta.resolve("../pcap/mod.ts");

/**
 * A factory whose one parameter is optional, which `.length` cannot see.
 *
 * Written in JavaScript because the erasure is the point: `(flag) => …` is
 * exactly what `maybe(flag?: boolean)` compiles to, and both report an arity
 * of 1.
 */
const OPTIONAL = "data:text/javascript,export const maybe = (flag) => " +
  "({ decode: () => [flag ?? null, 0], encode: () => 0 });";

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
    () =>
      loadCoder(
        "data:text/javascript,export const notAFactory = 42;",
        "notAFactory",
      ),
    Error,
    "is not a function",
  );
});

Deno.test("loadCoder refuses a factory whose arity nothing has verified", async () => {
  // The defect this guards: with `deno doc` unavailable the coder name is
  // taken on trust, and calling `pcapFileWith()` bare hands the struct
  // `undefined` sub-coders, failing somewhere inside the decode instead.
  const error = await assertRejects(
    () => loadCoder(PCAP, "pcapFileWith"),
    UnverifiedArityError,
  );

  assertEquals(error.coderName, "pcapFileWith");
  assertEquals(error.arity, 2);
});

Deno.test("loadCoder calls a factory a declaration-level count vouched for", async () => {
  // `.length` counts an optional parameter and the declaration does not, so
  // discovery's answer has to be able to overrule this one — otherwise the
  // check refuses a correct invocation whenever the permission is granted too.
  const coder = await loadCoder(OPTIONAL, "maybe", { arityVerified: true });

  assertEquals(coder.decode(new Uint8Array()), [null, 0]);
});

Deno.test("loadCoder rejects a package that cannot be resolved", async () => {
  await assertRejects(() =>
    loadCoder(import.meta.resolve("./no-such-module.ts"), "anything")
  );
});
