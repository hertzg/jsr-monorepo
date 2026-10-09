import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { zfBacklash } from "./zf-backlash.ts";

Deno.test("zfBacklash decodes both backlash values", () => {
  const root = parse(
    '<ZfBacklash version="1.1"><fBacklash>12</fBacklash>' +
      "<zBacklash>30</zBacklash></ZfBacklash>",
  ).root;

  assertEquals(zfBacklash.decode(root), { fBacklash: 12, zBacklash: 30 });
});

Deno.test("zfBacklash decodes an element with only the zoom value", () => {
  const root = parse(
    '<ZfBacklash version="1.1"><zBacklash>30</zBacklash></ZfBacklash>',
  ).root;

  assertEquals(zfBacklash.decode(root), { zBacklash: 30 });
});

Deno.test("zfBacklash decodes a value above the signed 32-bit range", () => {
  const root = parse(
    '<ZfBacklash version="1.1"><fBacklash>4294967295</fBacklash></ZfBacklash>',
  ).root;

  assertEquals(zfBacklash.decode(root).fBacklash, 4294967295);
});

Deno.test("zfBacklash writes focus before zoom", () => {
  const xml = zfBacklash.encode({ zBacklash: 30, fBacklash: 12 });

  assertEquals(
    xml,
    '<ZfBacklash version="1.1"><fBacklash>12</fBacklash>' +
      "<zBacklash>30</zBacklash></ZfBacklash>",
  );
});

Deno.test("zfBacklash round-trips through encode and decode", () => {
  const value = { fBacklash: 7, zBacklash: 19 };

  const xml = zfBacklash.encode(value);

  assertEquals(zfBacklash.decode(parse(xml).root), value);
});
