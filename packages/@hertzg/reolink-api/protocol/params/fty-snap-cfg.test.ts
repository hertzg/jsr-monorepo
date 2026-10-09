import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { ftySnapCfg } from "./fty-snap-cfg.ts";

Deno.test("ftySnapCfg decodes an empty element as an empty object", () => {
  const root = parse('<ftySnapCfg version="1.1"></ftySnapCfg>').root;

  assertEquals(ftySnapCfg.decode(root), {});
});

Deno.test("ftySnapCfg ignores children the firmware never reads", () => {
  const root =
    parse('<ftySnapCfg version="1.1"><unknown>1</unknown></ftySnapCfg>').root;

  assertEquals(ftySnapCfg.decode(root), {});
});

Deno.test("ftySnapCfg encodes an element with only the version attribute", () => {
  assertEquals(
    ftySnapCfg.encode({}),
    '<ftySnapCfg version="1.1"></ftySnapCfg>',
  );
});
