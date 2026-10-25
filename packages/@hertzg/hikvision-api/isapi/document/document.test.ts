import { assertEquals, assertThrows } from "@std/assert";
import { test } from "node:test";
import { document } from "./document.ts";
import { optional } from "./optional.ts";
import { text } from "./text.ts";

test("document reads its fields from the root", () => {
  const codec = document({ timeMode: text(), platformType: optional(text()) });

  assertEquals(codec.parse("<Time><timeMode>NTP</timeMode></Time>"), {
    timeMode: "NTP",
  });
});

test("document throws for a missing required field naming the root", () => {
  const codec = document({ timeMode: text() });

  assertThrows(
    () => codec.parse("<Time/>"),
    Error,
    "ISAPI <Time> has no <timeMode>",
  );
});
