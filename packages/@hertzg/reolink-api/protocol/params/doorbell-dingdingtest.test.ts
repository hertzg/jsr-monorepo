import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { doorbellDingdingtest } from "./doorbell-dingdingtest.ts";

Deno.test("doorbellDingdingtest decodes the test code 5 update list", () => {
  const root = parse(
    '<doorbellDingdingtest version="1.1">' +
      "<update><result>0</result><curVer>v1.0.1</curVer>" +
      "<reqVer>v1.0.2</reqVer></update>" +
      "<update><result>1</result><curVer>v2.0.1</curVer>" +
      "<reqVer>v2.0.2</reqVer></update></doorbellDingdingtest>",
  ).root;

  assertEquals(doorbellDingdingtest.decode(root), {
    update: [
      { result: 0, curVer: "v1.0.1", reqVer: "v1.0.2" },
      { result: 1, curVer: "v2.0.1", reqVer: "v2.0.2" },
    ],
  });
});

Deno.test("doorbellDingdingtest decodes the test code 0 frequency", () => {
  const root = parse(
    '<doorbellDingdingtest version="1.1"><freq>433</freq></doorbellDingdingtest>',
  ).root;

  assertEquals(doorbellDingdingtest.decode(root), { freq: 433 });
});

Deno.test("doorbellDingdingtest rejects an update without its version", () => {
  const root = parse(
    "<doorbellDingdingtest><update><result>0</result><curVer>v1</curVer>" +
      "</update></doorbellDingdingtest>",
  ).root;

  assertThrows(() => doorbellDingdingtest.decode(root), Error, "<reqVer>");
});

Deno.test("doorbellDingdingtest round-trips through encode and decode", () => {
  const value = {
    freq: 868,
    curFreq: 869,
    sub1gTestResult: 1,
    update: [{ result: 2, curVer: "v3.0.1", reqVer: "v3.0.2" }],
    dingdongTestResult: [{ state: 1, verifyResult: 0, agingResult: 1 }],
  };

  const xml = doorbellDingdingtest.encode(value);

  assertEquals(doorbellDingdingtest.decode(parse(xml).root), value);
});
