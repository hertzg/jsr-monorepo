import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { dayNightMode } from "./day-night-mode.ts";

Deno.test("dayNightMode decodes the cmd 164 reply", () => {
  const root =
    parse('<DayNightMode version="1.1"><mode>color</mode></DayNightMode>')
      .root;

  assertEquals(dayNightMode.decode(root), { mode: "color" });
});

Deno.test("dayNightMode round-trips through encode and decode", () => {
  const value = { mode: "blackAndWhite" as const };

  assertEquals(
    dayNightMode.decode(parse(dayNightMode.encode(value)).root),
    value,
  );
});

Deno.test("dayNightMode rejects a mode the firmware does not write", () => {
  const root = parse("<DayNightMode><mode>night</mode></DayNightMode>").root;

  assertThrows(() => dayNightMode.decode(root), Error, "blackAndWhite");
});
