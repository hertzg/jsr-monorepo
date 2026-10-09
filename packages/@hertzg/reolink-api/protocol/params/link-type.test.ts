import { assertEquals, assertExists, assertThrows } from "@std/assert";
import { isElement, parse } from "@std/xml";
import { linkType } from "./link-type.ts";

Deno.test("linkType decodes a cmd 93 reply captured from a camera", () => {
  const body = parse(
    '<?xml version="1.0" encoding="UTF-8" ?>\n' +
      "<body>\n" +
      '<LinkType version="1.1">\n' +
      "<type>LAN</type>\n" +
      "</LinkType>\n" +
      "</body>\n",
  ).root;
  const root = body.children.find(isElement);
  assertExists(root);

  assertEquals(linkType.decode(root), { type: "LAN" });
});

Deno.test("linkType round-trips every link the firmware writes", () => {
  for (const type of ["LAN", "PPPOE", "CDMA"] as const) {
    const value = { type };

    assertEquals(linkType.decode(parse(linkType.encode(value)).root), value);
  }
});

Deno.test("linkType rejects a link type the firmware never writes", () => {
  const root = parse('<LinkType version="1.1"><type>WIFI</type></LinkType>')
    .root;

  assertThrows(() => linkType.decode(root), Error, '"WIFI"');
});

Deno.test("linkType throws when the reply has no type", () => {
  const root = parse('<LinkType version="1.1"></LinkType>').root;

  assertThrows(() => linkType.decode(root), Error, "<type>");
});
