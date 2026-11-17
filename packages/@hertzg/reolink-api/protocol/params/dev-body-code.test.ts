import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { devBodyCode } from "./dev-body-code.ts";

test("devBodyCode decodes an empty element as an empty object", () => {
  const root = parse('<DevBodyCode version="1.1"></DevBodyCode>').root;

  assertEquals(devBodyCode.decode(root), {});
});

test("devBodyCode ignores children the firmware never reads", () => {
  const root =
    parse('<DevBodyCode version="1.1"><unknown>1</unknown></DevBodyCode>').root;

  assertEquals(devBodyCode.decode(root), {});
});

test("devBodyCode encodes an element with only the version attribute", () => {
  assertEquals(
    devBodyCode.encode({}),
    '<DevBodyCode version="1.1"></DevBodyCode>',
  );
});
