import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { ftyImageDetechRet } from "./fty-image-detech-ret.ts";

Deno.test("ftyImageDetechRet decodes both detection results", () => {
  const root = parse(
    '<ftyImageDetechRet version="1.1"><deadpix>3</deadpix>' +
      "<blot>1</blot></ftyImageDetechRet>",
  ).root;

  assertEquals(ftyImageDetechRet.decode(root), { deadpix: 3, blot: 1 });
});

Deno.test("ftyImageDetechRet decodes an element with only the blot", () => {
  const root = parse(
    '<ftyImageDetechRet version="1.1"><blot>4</blot></ftyImageDetechRet>',
  ).root;

  assertEquals(ftyImageDetechRet.decode(root), { blot: 4 });
});

Deno.test("ftyImageDetechRet round-trips through encode and decode", () => {
  const value = { deadpix: 5, blot: 0 };

  const xml = ftyImageDetechRet.encode(value);

  assertEquals(ftyImageDetechRet.decode(parse(xml).root), value);
});
