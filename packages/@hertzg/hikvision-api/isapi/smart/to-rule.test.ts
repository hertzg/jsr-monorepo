import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { toRule } from "./to-rule.ts";

test("toRule defaults enabled and detectionTarget", () => {
  assertEquals(toRule({ id: 1 }, [{ x: 1, y: 2 }]), {
    id: 1,
    enabled: false,
    detectionTarget: [],
    coordinates: [{ x: 1, y: 2 }],
  });
});

test("toRule keeps the decoded values over the defaults", () => {
  assertEquals(
    toRule({ id: 2, enabled: true, detectionTarget: ["human"] }, []),
    { id: 2, enabled: true, detectionTarget: ["human"], coordinates: [] },
  );
});
