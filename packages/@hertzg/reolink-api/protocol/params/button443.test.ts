import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { button443 } from "./button443.ts";

test("button443 encodes an empty element", () => {
  assertEquals(button443.encode({}), '<Button443 version="1.1"></Button443>');
});

test("button443 ignores children, as the firmware parser does", () => {
  const root = parse(
    '<Button443 version="1.1"><pressed>1</pressed></Button443>',
  ).root;

  assertEquals(button443.decode(root), {});
});

test("button443 round-trips through encode and decode", () => {
  const xml = button443.encode({});

  assertEquals(button443.decode(parse(xml).root), {});
});
