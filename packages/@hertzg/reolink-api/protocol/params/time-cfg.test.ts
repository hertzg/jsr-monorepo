import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { timeCfg } from "./time-cfg.ts";

test("timeCfg decodes realTime", () => {
  const root = parse(
    '<TimeCfg version="1.1"><realTime>1791504000</realTime></TimeCfg>',
  ).root;

  assertEquals(timeCfg.decode(root), { realTime: 1791504000 });
});

test("timeCfg round-trips a time past the signed 32-bit range", () => {
  const value = { realTime: 4294967295 };

  assertEquals(timeCfg.decode(parse(timeCfg.encode(value)).root), value);
});

test("timeCfg can be sent empty so the camera keeps its own time", () => {
  assertEquals(timeCfg.encode({}), '<TimeCfg version="1.1"></TimeCfg>');
});
