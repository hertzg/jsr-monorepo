import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { irCutInfo } from "./ir-cut-info.ts";

Deno.test("irCutInfo decodes an empty element as an empty object", () => {
  const root = parse('<IrCutInfo version="1.1"></IrCutInfo>').root;

  assertEquals(irCutInfo.decode(root), {});
});

Deno.test("irCutInfo ignores children the firmware never reads", () => {
  const root =
    parse('<IrCutInfo version="1.1"><unknown>1</unknown></IrCutInfo>').root;

  assertEquals(irCutInfo.decode(root), {});
});

Deno.test("irCutInfo encodes an element with only the version attribute", () => {
  assertEquals(irCutInfo.encode({}), '<IrCutInfo version="1.1"></IrCutInfo>');
});
