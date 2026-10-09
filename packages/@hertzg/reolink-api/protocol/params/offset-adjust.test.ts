import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { offsetAdjust } from "./offset-adjust.ts";

Deno.test("offsetAdjust decodes the request field", () => {
  const root = parse(
    "<OffsetAdjust><maxOffset>32</maxOffset></OffsetAdjust>",
  ).root;

  assertEquals(offsetAdjust.decode(root), { maxOffset: 32 });
});

Deno.test("offsetAdjust decodes the netserver reply", () => {
  const root = parse(
    '<OffsetAdjust version="1.1"><OffsetX>6</OffsetX><OffsetY>-3</OffsetY>' +
      "<Offset>7</Offset></OffsetAdjust>",
  ).root;

  assertEquals(offsetAdjust.decode(root), {
    OffsetX: 6,
    OffsetY: -3,
    Offset: 7,
  });
});

Deno.test("offsetAdjust round-trips through encode and decode", () => {
  const value = { maxOffset: 10, OffsetX: 1, OffsetY: 2, Offset: 3 };

  const xml = offsetAdjust.encode(value);

  assertEquals(offsetAdjust.decode(parse(xml).root), value);
});
