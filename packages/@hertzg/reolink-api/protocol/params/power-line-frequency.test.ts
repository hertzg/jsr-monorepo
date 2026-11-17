import { test } from "node:test";
import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { powerLineFrequency } from "./power-line-frequency.ts";

test("powerLineFrequency decodes the cmd 154 reply", () => {
  const root = parse(
    '<PowerLineFrequency version="1.1"><mode>50hz</mode><enable>0</enable>' +
      "</PowerLineFrequency>",
  ).root;

  assertEquals(powerLineFrequency.decode(root), { mode: "50hz", enable: 0 });
});

test("powerLineFrequency round-trips through encode and decode", () => {
  const value = { mode: "60hz" as const, enable: 1 };

  assertEquals(
    powerLineFrequency.decode(parse(powerLineFrequency.encode(value)).root),
    value,
  );
});

test("powerLineFrequency rejects a mode the firmware does not write", () => {
  const root = parse(
    "<PowerLineFrequency><mode>55hz</mode><enable>1</enable></PowerLineFrequency>",
  ).root;

  assertThrows(() => powerLineFrequency.decode(root), Error, "outdoor");
});
