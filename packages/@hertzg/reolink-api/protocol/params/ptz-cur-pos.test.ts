import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { ptzCurPos } from "./ptz-cur-pos.ts";

Deno.test("ptzCurPos decodes the reply the camera writes", () => {
  const root = parse(
    '<ptzCurPos version="1.1"><pPos>2710</pPos><tPos>145</tPos></ptzCurPos>',
  ).root;

  assertEquals(ptzCurPos.decode(root), { pPos: 2710, tPos: 145 });
});

Deno.test("ptzCurPos round-trips through encode and decode", () => {
  const value = { pPos: 3599, tPos: -20 };

  const xml = ptzCurPos.encode(value);

  assertEquals(ptzCurPos.decode(parse(xml).root), value);
});

Deno.test("ptzCurPos rejects a reply without a tilt position", () => {
  const root = parse('<ptzCurPos version="1.1"><pPos>100</pPos></ptzCurPos>')
    .root;

  assertThrows(() => ptzCurPos.decode(root), Error, "<tPos>");
});
