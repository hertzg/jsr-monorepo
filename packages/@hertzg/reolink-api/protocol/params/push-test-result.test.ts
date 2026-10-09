import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { pushTestResult } from "./push-test-result.ts";

Deno.test("pushTestResult decodes a successful cmd 358 reply", () => {
  const root = parse(
    '<PushTestResult version="1.1"><rspCode>0</rspCode>' +
      "<detail>Success</detail></PushTestResult>",
  ).root;

  assertEquals(pushTestResult.decode(root), { rspCode: 0, detail: "Success" });
});

Deno.test("pushTestResult round-trips a failure", () => {
  const value = { rspCode: -1, detail: "Undefined error" };

  const xml = pushTestResult.encode(value);

  assertEquals(pushTestResult.decode(parse(xml).root), value);
});

Deno.test("pushTestResult rejects a reply without a detail", () => {
  const root = parse(
    '<PushTestResult version="1.1"><rspCode>0</rspCode></PushTestResult>',
  ).root;

  assertThrows(() => pushTestResult.decode(root), Error, "<detail>");
});
