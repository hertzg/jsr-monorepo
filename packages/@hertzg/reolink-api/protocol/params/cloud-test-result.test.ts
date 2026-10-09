import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { cloudTestResult } from "./cloud-test-result.ts";

Deno.test("cloudTestResult decodes a successful cmd 367 reply", () => {
  const root = parse(
    '<CloudTestResult version="1.1"><rspCode>0</rspCode>' +
      "<detail>Success</detail></CloudTestResult>",
  ).root;

  assertEquals(cloudTestResult.decode(root), { rspCode: 0, detail: "Success" });
});

Deno.test("cloudTestResult round-trips a failure", () => {
  const value = { rspCode: 401, detail: "auth failed" };

  const xml = cloudTestResult.encode(value);

  assertEquals(cloudTestResult.decode(parse(xml).root), value);
});

Deno.test("cloudTestResult rejects a reply without a code", () => {
  const root = parse(
    '<CloudTestResult version="1.1"><detail>Success</detail></CloudTestResult>',
  ).root;

  assertThrows(() => cloudTestResult.decode(root), Error, "<rspCode>");
});
