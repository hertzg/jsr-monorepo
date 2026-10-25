import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { document } from "../document/document.ts";
import { ruleFields } from "./rule-fields.ts";

test("ruleFields reads the shared fields and leaves absent optionals out", () => {
  const rule = document(ruleFields);

  assertEquals(
    rule.parse(
      "<Rule><id>3</id><sensitivityLevel>40</sensitivityLevel>" +
        "<detectionTarget>human,vehicle</detectionTarget>" +
        "<alarmConfidence>high</alarmConfidence></Rule>",
    ),
    {
      id: 3,
      sensitivityLevel: 40,
      detectionTarget: ["human", "vehicle"],
      alarmConfidence: "high",
    },
  );
  assertEquals(rule.parse("<Rule><id>4</id></Rule>"), { id: 4 });
});
