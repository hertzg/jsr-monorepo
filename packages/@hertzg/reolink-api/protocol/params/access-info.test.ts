import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { accessInfo } from "./access-info.ts";

Deno.test("accessInfo decodes both base64 fields", () => {
  const root = parse(
    '<accessInfo version="1.1"><userName>dXNlci1hYmMxMjM=</userName>' +
      "<accesskey>a2V5LWFiYzEyMw==</accesskey></accessInfo>",
  ).root;

  assertEquals(accessInfo.decode(root), {
    userName: "dXNlci1hYmMxMjM=",
    accesskey: "a2V5LWFiYzEyMw==",
  });
});

Deno.test("accessInfo round-trips through encode and decode", () => {
  const value = { userName: "dXNlci1ydA==", accesskey: "a2V5LXJ0" };

  assertEquals(accessInfo.decode(parse(accessInfo.encode(value)).root), value);
});

Deno.test("accessInfo throws when an always-written field is missing", () => {
  const root = parse(
    '<accessInfo version="1.1"><userName>dXNlcg==</userName></accessInfo>',
  ).root;

  assertThrows(() => accessInfo.decode(root), Error, "<accesskey>");
});
