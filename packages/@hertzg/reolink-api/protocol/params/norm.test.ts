import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { norm } from "./norm.ts";

Deno.test("norm decodes the element the firmware writes", () => {
  const root = parse('<Norm version="1.1"><norm>NTSC</norm></Norm>').root;

  assertEquals(norm.decode(root), { norm: "NTSC" });
});

Deno.test("norm round-trips both standards", () => {
  for (const standard of ["PAL", "NTSC"] as const) {
    const value = { norm: standard };

    assertEquals(norm.decode(parse(norm.encode(value)).root), value);
  }
});

Deno.test("norm rejects a standard the firmware never writes", () => {
  const root = parse('<Norm version="1.1"><norm>SECAM</norm></Norm>').root;

  assertThrows(() => norm.decode(root), Error, '"SECAM"');
});
