import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { blc } from "./blc.ts";

Deno.test("blc decodes the cmd 168 reply", () => {
  const root = parse(
    '<BLC version="1.1"><enable>0</enable><BLCMode>backLight</BLCMode>' +
      "<level>77</level></BLC>",
  ).root;

  assertEquals(blc.decode(root), {
    enable: 0,
    BLCMode: "backLight",
    level: 77,
  });
});

Deno.test("blc round-trips through encode and decode", () => {
  const value = { enable: 1, BLCMode: "dynamicRange" as const, level: 200 };

  assertEquals(blc.decode(parse(blc.encode(value)).root), value);
});

Deno.test("blc rejects a mode the firmware does not write", () => {
  const root = parse(
    "<BLC><enable>1</enable><BLCMode>wdr</BLCMode><level>1</level></BLC>",
  ).root;

  assertThrows(() => blc.decode(root), Error, "backLight, dynamicRange");
});
