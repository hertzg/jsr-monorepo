import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { bandWidthTest } from "./band-width-test.ts";

Deno.test("bandWidthTest decodes the enable switch", () => {
  const root = parse(
    '<BandWidthTest version="1.1"><enable>1</enable></BandWidthTest>',
  ).root;

  assertEquals(bandWidthTest.decode(root), { enable: 1 });
});

Deno.test("bandWidthTest decodes an element without the switch", () => {
  const root = parse('<BandWidthTest version="1.1"></BandWidthTest>').root;

  assertEquals(bandWidthTest.decode(root), {});
});

Deno.test("bandWidthTest round-trips through encode and decode", () => {
  const value = { enable: 0 };

  const xml = bandWidthTest.encode(value);

  assertEquals(bandWidthTest.decode(parse(xml).root), value);
});
