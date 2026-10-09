import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { whiteLightInfo } from "./white-light-info.ts";

Deno.test("whiteLightInfo decodes an empty element as an empty object", () => {
  const root = parse('<whiteLightInfo version="1.1"></whiteLightInfo>').root;

  assertEquals(whiteLightInfo.decode(root), {});
});

Deno.test("whiteLightInfo ignores children the firmware never reads", () => {
  const root =
    parse('<whiteLightInfo version="1.1"><unknown>1</unknown></whiteLightInfo>')
      .root;

  assertEquals(whiteLightInfo.decode(root), {});
});

Deno.test("whiteLightInfo encodes an element with only the version attribute", () => {
  assertEquals(
    whiteLightInfo.encode({}),
    '<whiteLightInfo version="1.1"></whiteLightInfo>',
  );
});
