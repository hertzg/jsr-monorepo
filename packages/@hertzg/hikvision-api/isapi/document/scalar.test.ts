import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
import { scalar } from "./scalar.ts";

test("scalar hands the element's text to convert", () => {
  const field = scalar((text) => text.length);

  assertEquals(field.decode(parse("<a>four</a>").root), 4);
});

test("scalar joins text and CDATA children", () => {
  const field = scalar((text) => text);

  assertEquals(field.decode(parse("<a>x<![CDATA[y]]>z</a>").root), "xyz");
});

test("scalar reads an empty element as the empty string", () => {
  const field = scalar((text) => text);

  assertEquals(field.decode(parse("<a/>").root), "");
});

test("scalar hands convert the element for messages", () => {
  const field = scalar((_text, element) => element.name.local);

  assertEquals(
    field.decode(parse("<channelID>1</channelID>").root),
    "channelID",
  );
});
