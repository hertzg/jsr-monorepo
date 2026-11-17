# ADR 0007 - JSDoc examples run as tests

Every exported member has JSDoc with at least one `@example`, and every example
is a full program that CI runs.

````ts
/**
 * @example Round-trip
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse, stringify } from "@hertzg/mac";
 *
 * assertEquals(stringify(parse("AA-BB-CC-DD-EE-FF")), "aa:bb:cc:dd:ee:ff");
 * ```
 */
````

`bun run test:doc` runs `_tools/doctest.ts`. It lifts each fenced `ts` block
out of the JSDoc and runs it with Bun. A block that throws fails the build. A
block fenced `ts ignore` is skipped.

Examples assert with `@std/assert` and don't `console.log`. A codec example
encodes, decodes and asserts equality. Examples are run, not type-checked: one
with a type error that still runs passes.
