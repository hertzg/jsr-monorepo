import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { exposureCfg } from "./exposure-cfg.ts";

Deno.test("exposureCfg decodes the cmd 156 reply", () => {
  const root = parse(
    '<ExposureCfg version="1.1"><exposureType>gainFist</exposureType></ExposureCfg>',
  ).root;

  assertEquals(exposureCfg.decode(root), { exposureType: "gainFist" });
});

Deno.test("exposureCfg round-trips through encode and decode", () => {
  const value = { exposureType: "manual" as const };

  assertEquals(
    exposureCfg.decode(parse(exposureCfg.encode(value)).root),
    value,
  );
});

Deno.test("exposureCfg rejects the corrected spelling gainFirst", () => {
  const root = parse(
    "<ExposureCfg><exposureType>gainFirst</exposureType></ExposureCfg>",
  ).root;

  assertThrows(() => exposureCfg.decode(root), Error, "gainFist");
});
