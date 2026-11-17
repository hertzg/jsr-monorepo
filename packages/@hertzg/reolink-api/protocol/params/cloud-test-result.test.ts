import { test } from "node:test";
import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { cloudTestResult } from "./cloud-test-result.ts";

test("cloudTestResult decodes a successful cmd 367 reply", () => {
  const root = parse(
    '<CloudTestResult version="1.1"><rspCode>0</rspCode>' +
      "<detail>Success</detail></CloudTestResult>",
  ).root;

  assertEquals(cloudTestResult.decode(root), { rspCode: 0, detail: "Success" });
});

test("cloudTestResult round-trips a failure", () => {
  const value = { rspCode: 401, detail: "auth failed" };

  const xml = cloudTestResult.encode(value);

  assertEquals(cloudTestResult.decode(parse(xml).root), value);
});

test("cloudTestResult rejects a reply without a code", () => {
  const root = parse(
    '<CloudTestResult version="1.1"><detail>Success</detail></CloudTestResult>',
  ).root;

  assertThrows(() => cloudTestResult.decode(root), Error, "<rspCode>");
});
