import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { paramDataV20 } from "./param-data-v20.ts";

Deno.test("paramDataV20 decodes an empty element as an empty object", () => {
  const root = parse('<PARAM_DATA_V20 version="1.1"></PARAM_DATA_V20>').root;

  assertEquals(paramDataV20.decode(root), {});
});

Deno.test("paramDataV20 encodes an element with only the version attribute", () => {
  assertEquals(
    paramDataV20.encode({}),
    '<PARAM_DATA_V20 version="1.1"></PARAM_DATA_V20>',
  );
});
