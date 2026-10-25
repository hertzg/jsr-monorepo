import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { SMART_RULE_TYPES } from "./smart-rule-types.ts";

test("SMART_RULE_TYPES lowercases only the two detection event types", () => {
  assertEquals(SMART_RULE_TYPES.FieldDetection, "fielddetection");
  assertEquals(SMART_RULE_TYPES.LineDetection, "linedetection");
  assertEquals(SMART_RULE_TYPES.rapidMove, "rapidMove");
  assertEquals(SMART_RULE_TYPES.attendedBaggage, "attendedBaggage");
});
