import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { gain } from "./gain.ts";

Deno.test("gain decodes the cmd 160 reply", () => {
  const root = parse('<Gain version="1.1"><gainLevel>63</gainLevel></Gain>')
    .root;

  assertEquals(gain.decode(root), { gainLevel: 63 });
});

Deno.test("gain round-trips through encode and decode", () => {
  const value = { gainLevel: 12 };

  assertEquals(gain.decode(parse(gain.encode(value)).root), value);
});

Deno.test("gain throws without gainLevel, which the camera always writes", () => {
  const root = parse("<Gain></Gain>").root;

  assertThrows(() => gain.decode(root), Error, "<gainLevel>");
});
