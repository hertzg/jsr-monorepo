import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { floodlightManual } from "./floodlight-manual.ts";

Deno.test("floodlightManual decodes channel and status", () => {
  const root = parse(
    '<FloodlightManual version="1.1"><status>1</status><channel>2</channel>' +
      "</FloodlightManual>",
  ).root;

  assertEquals(floodlightManual.decode(root), { channel: 2, status: 1 });
});

Deno.test("floodlightManual round-trips every field", () => {
  const value = { channel: 1, status: 0 };

  assertEquals(
    floodlightManual.decode(parse(floodlightManual.encode(value)).root),
    value,
  );
});

Deno.test("floodlightManual writes only the fields that are set", () => {
  assertEquals(
    floodlightManual.encode({ status: 1 }),
    '<FloodlightManual version="1.1"><status>1</status></FloodlightManual>',
  );
});
