import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { imageCheck } from "./image-check.ts";

Deno.test("imageCheck decodes an empty element as an empty object", () => {
  const root = parse('<ImageCheck version="1.1"></ImageCheck>').root;

  assertEquals(imageCheck.decode(root), {});
});

Deno.test("imageCheck ignores children the firmware never reads", () => {
  const root =
    parse('<ImageCheck version="1.1"><unknown>1</unknown></ImageCheck>').root;

  assertEquals(imageCheck.decode(root), {});
});

Deno.test("imageCheck encodes an element with only the version attribute", () => {
  assertEquals(
    imageCheck.encode({}),
    '<ImageCheck version="1.1"></ImageCheck>',
  );
});
